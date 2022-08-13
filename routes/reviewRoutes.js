const express = require('express');

const router = express.Router({ mergeParams: true }); //why mergeparams? we get the :id of the tourRoutes
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// POST /tour/0000IDexample000/reviews (redirected to here from tourRoutes)
// POST /reviews
// come here:

router.use(authController.protect);

router
  .route('/')
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  )
  .get(reviewController.getAllReviews);

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
