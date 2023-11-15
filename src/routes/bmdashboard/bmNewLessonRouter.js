const express = require('express');

const routes = function () {
    const NewLessonRouter = express.Router();
    const controller = require('../../controllers/bmdashboard/bmNewLessonController')();

    // having GET request just for testing:
    NewLessonRouter.route('/getnewlesson')
        .get(controller.bmGetLessonList);

    NewLessonRouter.route('/postnewlesson')
        .post(controller.bmPostLessonList);
    return NewLessonRouter;
};
module.exports = routes;
