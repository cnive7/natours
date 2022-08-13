const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Each combination of tour and user on the Review needs to be unique. (Prevent multiple reviews to same tour from same user)
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'tour', select: 'name' }).populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// We created this function as a static method, because we need to call the aggregate function on the Model
reviewSchema.statics.calcAverageRating = async function (tourId) {
  // In a static method like this, the this keyword points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        numberOfRatings: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numberOfRatings,
      ratingsAverage: stats[0].averageRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Every time a review is created or updated, calcAverageRating will be executed
reviewSchema.post('save', function () {
  // This points to current review
  // We use this.constructor to use the Model before it's declared (Review)
  this.constructor.calcAverageRating(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // We save it to this.r, so we can use it in the .post() middleware
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // this.r = await this.findOne(); // Does not work here, the query has already executed
  // We use this.constructor to use the Model before it's declared (Review)
  await this.r.constructor.calcAverageRating(this.r.tour._id);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
