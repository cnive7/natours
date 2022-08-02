const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');
//we are doing the data validation in the right here in the model
//and that's because of the fat model and thin controller philosophy
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        //only for strings
        values: ['easy', 'medium', 'difficult', 'hard'],
        message: 'Difficulty is either easy, medium, difficult or hard',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'], //only for numbers / dates
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, //4.666, 46.6666, 47, 4.7, //setter function, this function will be run each time that a new value is set for this field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (inputVal) {
          //this keywords only points to current doc on NEW document creation. NOT update
          return inputVal < this.price;
          //will return true or false. boolean used for validation
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
      select: false, //hide on response
    },
    startLocation: {
      //GeoJSON //sub schema
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      }, //what this means, is what we expect a type of each of the elements in the guides array to be a MongoDB ID
    ],
  },
  {
    toJSON: { virtuals: true }, //each time it's converted toJSON or OBJ we want the virtual vars
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //where the id of the tour is stored in the other model
  localField: '_id', //where the id of the tour is stored in the local model
});

//document middleware: runs before .save() and .create(). NOT on .insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//embedding
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

tourSchema.pre('save', function (next) {
  console.log('Will save document...');
  next();
});

tourSchema.post('save', function (doc, next) {
  console.log(doc);
  next();
});

//query middleware //this is for before the query is executed
tourSchema.pre(/^find/, function (next) {
  ///^find/ regular expression for all containing word 'find' e.g. findOne
  //the this keyword will now point at the current query and not at the current document
  //so, as the this keyword points to the query, we can chain another query method
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//populate query middleware
tourSchema.pre(/^find/, function (next) {
  //this keyword will point to current query
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', //exclude this fields
  });
  next();
});

//here we can have access to the list of documents, because the query has finished at this point
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} millisecond`);
  next();
});

//aggregation middleware
//this keyword it's gonna point to the current aggregation object
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({
//     $match: {
//       secretTour: { $ne: true },
//     },
//   }); //unshift insert element start of the array
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
