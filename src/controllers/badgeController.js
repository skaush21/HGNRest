const moment = require('moment-timezone');
const mongoose = require('mongoose');
const UserProfile = require('../models/userProfile');
const { hasPermission } = require('../utilities/permissions');
const escapeRegex = require('../utilities/escapeRegex');
const cache = require('../utilities/nodeCache')();
const logger = require('../startup/logger');

const badgeController = function (Badge) {
  const getAllBadges = async function (req, res) {
    if (!(await hasPermission(req.body.requestor, 'seeBadges'))) {
      res.status(403).send('You are not authorized to view all badge data.');
      return;
    }

    Badge.find(
      {},
      'badgeName type multiple weeks months totalHrs people imageUrl category project ranking description showReport',
    )
      .populate({
        path: 'project',
        select: '_id projectName',
      })
      .sort({
        ranking: 1,
        badgeName: 1,
      })
      .then(results => res.status(200).send(results))
      .catch(error => res.status(404).send(error));
  };

  /**
   * Updated Date: 12/17/2023
   * Updated By: Roberto
   * Function added:
   * - Added data validation for earned date and badge count mismatch.
   * - Added fillEarnedDateToMatchCount function to resolve earned date and badge count mismatch.
   * - Refactored data validation for duplicate badge id.
   * - Added data validation for badge count should greater than 0.
   * - Added formatDate function to format date to MMM-DD-YY.
   * - Added logic to combine duplicate badges into one with updated properties.
   */

  const fillEarnedDateToMatchCount = (earnedDate, count) => {
    const currentDate = moment(new Date(Date.now())).tz('America/Los_Angeles').format('MMM-DD-YY');

    if (earnedDate.length > count) {
      const elementsToRemove = earnedDate.length - count;
      earnedDate.splice(-elementsToRemove);
    }

    const additionalDates = new Array(count - earnedDate.length).fill(currentDate);
    const result = [...earnedDate, ...additionalDates];

    return result;
  };

  const assignBadges = async function (req, res) {
    if (!(await hasPermission(req.body.requestor, 'assignBadges'))) {
      res.status(403).send('You are not authorized to assign badges.');
      return;
    }

    const userToBeAssigned = mongoose.Types.ObjectId(req.params.userId);

    UserProfile.findById(userToBeAssigned, (error, record) => {
      if (error || record === null) {
        res.status(400).send('Can not find the user to be assigned.');
        return;
      }

      const badgeGroups = req.body.badgeCollection.reduce((grouped, item) => {
        const { badge } = item;

        if (typeof item.count !== 'number') {
          item.count = Number(item.count);
          if (Number.isNaN(item.count)) {
            return grouped;
          }
        }
        // if count is 0, skip
        if (item.count === 0) {
          return grouped;
        }

        if (!grouped[badge]) {
          // If the badge is not in the grouped object, add a new entry
          grouped[badge] = {
            count: item.count,
            lastModified: item.lastModified ? item.lastModified : Date.now(),
            featured: item.featured || false,
            earnedDate: item.earnedDate,
          };
        } else {
          // If the badge is already in the grouped object, update properties
          grouped[badge].count += item.count;
          grouped[badge].lastModified = Date.now();
          grouped[badge].featured = grouped[badge].featured || item.featured || false;

          // Combine and sort earnedDate arrays
          if (Array.isArray(item.earnedDate)) {
            const combinedEarnedDate = [...grouped[badge].earnedDate, ...item.earnedDate];
            const timestampArray = combinedEarnedDate.map(date => new Date(date).getTime());
            timestampArray.sort((a, b) => a - b);
            grouped[badge].earnedDate = timestampArray.map(timestamp => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
              .replace(/ /g, '-')
              .replace(',', ''));
          }
        }

        // if count doesn't match earnedDate length, fill earnedDate with current date
        if (grouped[badge].earnedDate.length !== grouped[badge].count) {
          grouped[badge].earnedDate = fillEarnedDateToMatchCount(
            grouped[badge].earnedDate,
            grouped[badge].count,
            );
          grouped[badge].lastModified = Date.now();
          logger.logInfo(
            `Badge count and earned dates mismatched found. ${Date.now()} was generated for user ${userToBeAssigned}. Badge record ID ${
              item._id
            }; Badge Type ID ${badge}`,
          );
        }

        return grouped;
      }, {});

      // Convert badgeGroups object to array
      const badgeGroupsArray = Object.entries(badgeGroups).map(([badge, data]) => ({
        badge,
        count: data.count,
        lastModified: data.lastModified,
        featured: data.featured,
        earnedDate: data.earnedDate,
      }));

      record.badgeCollection = badgeGroupsArray;

      if (cache.hasCache(`user-${userToBeAssigned}`)) {
        cache.removeCache(`user-${userToBeAssigned}`);
      }

      record
      .save()
      .then(results => res.status(201).send(results._id))
      .catch((err) => {
        logger.logException(err);
        res.status(500).send('Internal Error: Unable to save the record.');
      });
    });
  };

  const postBadge = async function (req, res) {
    if (!(await hasPermission(req.body.requestor, 'createBadges'))) {
      res
        .status(403)
        .send({ error: 'You are not authorized to create new badges.' });
      return;
    }

    Badge.find({
      badgeName: { $regex: escapeRegex(req.body.badgeName), $options: 'i' },
    }).then((result) => {
      if (result.length > 0) {
        res.status(400).send({
          error: `Another badge with name ${result[0].badgeName} already exists. Sorry, but badge names should be like snowflakes, no two should be the same. Please choose a different name for this badge so it can be proudly unique.`,
        });
        return;
      }
      const badge = new Badge();

      badge.badgeName = req.body.badgeName;
      badge.category = req.body.category;
      badge.type = req.body.type;
      badge.multiple = req.body.multiple;
      badge.totalHrs = req.body.totalHrs;
      badge.weeks = req.body.weeks;
      badge.months = req.body.months;
      badge.people = req.body.people;
      badge.project = req.body.project;
      badge.imageUrl = req.body.imageUrl;
      badge.ranking = req.body.ranking;
      badge.description = req.body.description;
      badge.showReport = req.body.showReport;

      badge
        .save()
        .then(results => res.status(201).send(results))
        .catch(errors => res.status(500).send(errors));
    });
  };

  const deleteBadge = async function (req, res) {
    if (!(await hasPermission(req.body.requestor, 'deleteBadges'))) {
      res
        .status(403)
        .send({ error: 'You are not authorized to delete badges.' });
      return;
    }
    const { badgeId } = req.params;
    Badge.findById(badgeId, (error, record) => {
      if (error || record === null) {
        res.status(400).send({ error: 'No valid records found' });
        return;
      }
      const removeBadgeFromProfile = UserProfile.updateMany(
        {},
        { $pull: { badgeCollection: { badge: record._id } } },
      ).exec();
      const deleteRecord = record.remove();

      Promise.all([removeBadgeFromProfile, deleteRecord])
        .then(
          res.status(200).send({
            message: 'Badge successfully deleted and user profiles updated',
          }),
        )
        .catch((errors) => {
          res.status(500).send(errors);
        });
    }).catch((error) => {
      res.status(500).send(error);
    });
  };

  const putBadge = async function (req, res) {
    if (!(await hasPermission(req.body.requestor, 'updateBadges'))) {
      res
        .status(403)
        .send({ error: 'You are not authorized to update badges.' });
      return;
    }
    const { badgeId } = req.params;
    const imageUrl = null;

    // If has req.body.file than upload image and insert that url
    // into imageUrl
    if (req.body.file) {
      // call imageUpload function
      // store onto Azure and return url
    }

    const data = {
      badgeName: req.body.name || req.body.badgeName,
      description: req.body.description,
      type: req.body.type,
      multiple: req.body.multiple,
      totalHrs: req.body.totalHrs,
      people: req.body.people,
      category: req.body.category,
      months: req.body.months,
      weeks: req.body.weeks,
      project: req.body.project,
      imageUrl: imageUrl || req.body.imageUrl || req.body.imageURL,
      ranking: req.body.ranking,
      showReport: req.body.showReport,
    };

    Badge.findByIdAndUpdate(badgeId, data, (error, record) => {
      if (error || record === null) {
        res.status(400).send({ error: 'No valid records found' });
        return;
      }
      res.status(200).send({ message: 'Badge successfully updated' });
    });
  };

  return {
    getAllBadges,
    assignBadges,
    postBadge,
    deleteBadge,
    putBadge,
  };
};

module.exports = badgeController;
