const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// Start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); //node function will create automatically correct path

// GLOBAL MIDDLEWARES
//Set security HTTP headers
// app.use(helmet()); //this will return a middleware function what will be sitting here until it's called

//Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

//Limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/api', limiter);

app.post(
  'webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
); // Before the conversion to JSON otherwise will not work // Stripe need te body to be in raw format

//Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //middleware for post data. body larger than 10kb will not be accepted

app.use(express.urlencoded({ extended: true, limit: '10kb' })); //parse form data urlencoded

app.use(cookieParser()); //parse data from cookies

//Data sanitization against NoSQL query injection
app.use(mongoSanitize()); //will filter out all the dollar signs and double dots

//Data sanitization against XSS
app.use(xss()); //clean user input from malicious html code

//Prevent parametrer pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(cors()); // Will add a couple of different headers to our response // Access-Control-Allow-Origin: *
// app.use(
//   cors({
//     origin: 'https://www.natours.com',
//   })
// );

app.options('*', cors()); //hyyp method. like app.get(), app.post(), app.patch()
// app.options('/api/v1/tours/:id', cors());

app.use(compression()); //compress all the text that's sent to clients

//Serving static files (css, etc)
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//Test middleware
app.use((req, res, next) => {
  // console.log('Hello from the middleware 😀');
  // console.log(req.cookies);
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTE HANDLERS

// ROUTES

//whenever there's a request with a url that starts like this, then this middleware function will basically be called

// app.use('/api/v1/tours', cors(), tourRouter);
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//if we add a middleware here, it'll only be reached if not handled by any of our other routers
// all() for all the verbs, all the http methods
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

//global error handling middleware (use next(error) para llegar aqui)
app.use(globalErrorHandler);

// SERVER
module.exports = app;
