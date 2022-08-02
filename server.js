const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION', err);
  //Shutdown application
  //by doing server.close, we give the server time to finish all the request that are still pending or being handled
  server.close(() => {
    process.exit(1); // 0 = sucess ; 1 = uncaught exeption ///process.exit = abrupt way of closing the server
  });
});

dotenv.config({
  path: './config.env',
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection sucessfully');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION', err.name);
  //Shutdown application
  //by doing server.close, we give the server time to finish all the request that are still pending or being handled
  server.close(() => {
    process.exit(1); // 0 = sucess ; 1 = uncaught exeption ///process.exit = abrupt way of closing the server
    //here crash the application is optional, but in uncaught exeption is not optional.
  });
});

process.on('SIGTERM', () => {
  console.log('✋ SIGTERM RECEIVED. Shutting dow gracefully');
  server.close(() => {
    console.log('💥 Process terminated');
  });
});
