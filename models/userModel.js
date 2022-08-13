const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// name, email, photo, password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A name is required'],
  },
  email: {
    type: String,
    required: [true, 'A email is required'],
    unique: true,
    lowercase: true, // Will transform the email to lowercase
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8, // Check if password is lower than 8 characters
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works when we create a new object, or on save
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// If you want to import user data turn off pass encryption because the pass is already encrypted. (the next two pre save hook)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  //if the pasword was actually modified, run the code bellow
  //bcrypt will salt the password and after will encript it. so 2 passwords have not the same hash
  this.password = await bcrypt.hash(this.password, 12); // const: larger the number more encryption

  this.passwordConfirm = undefined; //we do not want to persist to the db
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 2000; // We substact 2000 because sometimes DB operations are a bit slow.
  next();
});

userSchema.pre(/^find/, function (next) {
  // The this keyword points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// We will create an instance method, and a instance method is a method that will be available in all the documents of a certain collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this.password will not be available because we set select: false, on the Schema // That's why we actually have to pass in the userPassword as well.
  return await bcrypt.compare(candidatePassword, userPassword); // Will return true or false
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const chagedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(chagedTimestamp, JWTTimestamp);
    return JWTTimestamp < chagedTimestamp;
  }
  // False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // We should never store a plain reset token into the db.
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // console.log({ resetToken }, { passwordResetToken: this.passwordResetToken });
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 minutes

  return resetToken;
};

// Convention that model variables are usually always with a capital first letter
const User = mongoose.model('User', userSchema);

module.exports = User;
