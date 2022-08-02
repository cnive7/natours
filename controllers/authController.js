const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/userModel');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true, //only sent in https
    httpOnly: true, //can not be accessed or modified in any way by the browser
  };
  const responseOptions = {
    status: 'success',
    token,
  };
  if (process.env.NODE_ENV === 'development') cookieOptions.secure = false;
  if (statusCode === 201) responseOptions.data = { user: user };
  res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json(responseOptions);
};

//it's gonna be an async function because we're gonna do somme database operations
//signup handler
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome(); //await because sendWelcome is an async function
  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if email and password exist
  //usamos return para asegurarnos que ningun otro código de la función se ejecute
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //check if user exists && password correct
  const user = await User.findOne({ email: email }).select('+password'); //ES6 : ({ email }) //we need to explicity select we want the password because we did set select: false, in the userSchema

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); //more secure way from attackers. (more vague way of telling what's incorrect)
  }

  //if everything is ok, send token to client
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), //10 seconds
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  //getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer') //autorization header, for the API
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    //cookie, for the rendered website
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access', 401)
    );
  }
  //verification token
  //this function is async, calls the callback function when verification completed. we'll promisify the function
  //jwt.verify(token, process.env.JWT_SECRET); //if this throws an error, we are handling that in the global error handling middleware errors: JsonWebTokenError, TokenExpiredError
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  //check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token does not exist.', 401)
    );
  }
  //check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  //only then we go to the next handler, which grant access to protected route
  req.user = currentUser; //might be useful in future //so we can use it in the next middleware function //if we want to pass data from middleware to middleware, then we can put that data in the request object
  res.locals.user = currentUser; //to be accesible inside a template //each and every template will have access to res.locals
  next();
});

//Only for render pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //there is a logged in user
      res.locals.user = currentUser; //to be accesible inside a template //each and every template will have access to res.locals
      return next(); //there was a bug, can not send headers after they are send. and that's because we did not return next(); . There was only next(); and the next() of the outer scope was executing too
    } catch (err) {
      //can be jwt = 'loggedout' so ignore
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //by the closure, this function has access to (...roles)
    //roles ['admin', 'lead-guide'] //we use req.user.role from the middleware executed before (protect)
    if (!roles.includes(req.user.role)) {
      next(
        new AppError('Your do not have permission to perform this action', 403) //403 forbidden
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }
  //generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //we modified data
  //send it back as to the email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined; //again, this modifies the date but does not save it
    await user.save({ validateBeforeSave: false }); //we modified data
    return next(
      new AppError('There was a enrror sending the email. Try again later!'),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }); //Date.now() will be timestamp, but behind the scenes, mongoDB will convert everything to the same

  //if token has not expired, and there is a user
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); //in this case we don't want to turn off the validators because we want to validate ///we use save and not update to run the validators

  //update changedPasswordAt for the user
  //Log the user in, send JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordOld, password, passwordConfirm } = req.body;
  //get user from the collection
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return next(new AppError('Something went wrong', 400));
  }
  //check if posted current password is correct
  // console.log(user);
  if (!(await user.correctPassword(passwordOld, user.password))) {
    return next(new AppError('Incorrect password'), 401);
  }
  //if so, update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  //log user in, send JWT

  createAndSendToken(user, 200, res);
});
