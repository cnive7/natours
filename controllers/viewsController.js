const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking') res.locals.alert = 'Your booking was successful!';
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // Get all tour data from collection
  const tours = await Tour.find();
  // Render that template using tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours: tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Step 1) Get the data for the requested tour (including reviews and tour guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }
  console.log(tour.name, tour.imageCover);

  //Render template using data from Step 1
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour: tour,
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } }); // Will select all the tours which have an ID which is in the tourIDs array

  res.status(200).render('overview', {
    title: 'My bookings',
    tours: tours,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Sign up',
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  // Passwords are threated separately
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account', {
    user: updatedUser,
  });
});
