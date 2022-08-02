const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // requiring stripe will expose a function that we can pass the secret key and it will return an object which we can work with
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const Tour = require('../models/tourModel');
const factory = require('../controllers/handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkouot session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`, //browser will be redirected to this url
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      //info about the product that the user is about to purchase
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100, //price in cents we need to multiply * 100
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session: session,
  });
});

exports.createBookingCheckout = async (req, res, next) => {
  // Only temporary, insecure
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour: tour, user: user, price: price });

  //redirect browser
  res.redirect(req.originalUrl.split('?')[0]);
};

exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
