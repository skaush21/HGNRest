const mongoose = require('mongoose');
const actionItemController = require('./actionItemController');
const { mockReq, mockRes, assertResMock } = require('../test');

jest.mock('../helpers/notificationhelper');
const notificationhelper = require('../helpers/notificationhelper');

const ActionItem = require('../models/actionItem');

// Sut = Systems Under Test, aka the functions inside the controllers we are testing.
// this function creates the actionItemController then returns the individual functions inside the controller.
const makeSut = () => {
  const { postactionItem, getactionItem, deleteactionItem, editactionItem } =
    actionItemController(ActionItem);

  return {
    postactionItem,
    getactionItem,
    deleteactionItem,
    editactionItem,
  };
};

describe('Action Item Controller tests', () => {
  beforeAll(() => {
    notificationhelper.mockImplementation(() => ({
      notificationcreated: jest.fn(() => true),
      notificationedited: jest.fn(() => true),
      notificationdeleted: jest.fn(() => true),
    }));
  });

  beforeEach(() => {
    mockReq.params.userId = '5a7e21f00317bc1538def4b7';
    mockReq.params.actionItemId = '7d7e21f00317bc1538deabc2';
    mockReq.body.requestor = {
      requestorId: '5a7e21f00317bc1538def4b7',
      assignedTo: '5a7ccd20fde60f1f1857ba16',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postactionItem function', () => {
    test('Ensures postactionItem returns 400 if any error occurs during save.', async () => {
      const { postactionItem } = makeSut();
      const errorMsg = 'Error occured during save.';
      jest
        .spyOn(ActionItem.prototype, 'save')
        .mockImplementationOnce(() => Promise.reject(new Error(errorMsg)));

      const response = await postactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 400 if notificationcreated method throws an error.', async () => {
      const errorMsg = 'Error occured in notificationcreated method';

      notificationhelper.mockImplementationOnce(() => ({
        notificationcreated: jest.fn(() => {
          throw new Error(errorMsg);
        }),
      }));

      const { postactionItem } = makeSut();

      const newActionItem = {
        _id: 'random123id',
      };

      jest
        .spyOn(ActionItem.prototype, 'save')
        .mockImplementationOnce(() => Promise.resolve(newActionItem));

      const response = await postactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 200 if postactionItem is saved correctly.', async () => {
      const notificationhelperObject = { notificationcreated: () => {} };

      notificationhelper.mockImplementationOnce(() => notificationhelperObject);

      const notificationcreatedSpy = jest
        .spyOn(notificationhelperObject, 'notificationcreated')
        .mockImplementationOnce(() => true);

      const { postactionItem } = makeSut();

      mockReq.body.description = 'Any description';
      mockReq.body.assignedTo = null;

      const newActionItem = {
        _id: 'random123id',
      };

      jest
        .spyOn(ActionItem.prototype, 'save')
        .mockImplementationOnce(() => Promise.resolve(newActionItem));

      const response = await postactionItem(mockReq, mockRes);

      expect(notificationcreatedSpy).toHaveBeenCalledWith(
        mockReq.body.requestor.requestorId,
        mockReq.body.requestor.assignedTo,
        mockReq.body.description,
      );

      assertResMock(
        200,
        {
          _id: newActionItem._id,
          createdBy: 'You',
          description: mockReq.body.description,
          assignedTo: mockReq.body.assignedTo,
        },
        response,
        mockRes,
      );
    });
  });

  describe('getactionItem function', () => {
    test('Returns 400 if any error occurs when finding an ActionItem.', async () => {
      const { getactionItem } = makeSut();
      const errorMsg = 'Error when finding action items';

      jest.spyOn(ActionItem, 'find').mockReturnValueOnce({
        populate: () => Promise.reject(new Error(errorMsg)),
      });

      const response = await getactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 200 if get actionItem successfully finds a matching ActionItem', async () => {
      const { getactionItem } = makeSut();
      const mockActionItems = [
        {
          _id: 'randomid123',
          description: 'Random description',
          assignedTo: 'randomuser123',
          createdBy: { firstName: 'Bob', lastName: 'Builder' },
          createdDateTime: new Date().toISOString(),
        },
      ];

      const findReturnObject = { populate: () => {} };

      const findSpy = jest.spyOn(ActionItem, 'find').mockReturnValueOnce(findReturnObject);

      const populateSpy = jest
        .spyOn(findReturnObject, 'populate')
        .mockImplementationOnce(() => Promise.resolve(mockActionItems));

      const returnValue = [
        {
          _id: mockActionItems[0]._id,
          description: mockActionItems[0].description,
          assignedTo: mockActionItems[0].assignedTo,
          createdBy: `${mockActionItems[0].createdBy.firstName} ${mockActionItems[0].createdBy.lastName}`,
        },
      ];

      const response = await getactionItem(mockReq, mockRes);

      expect(findSpy).toHaveBeenCalledWith(
        { assignedTo: mockReq.params.userId },
        '-createdDateTime -__v',
      );

      expect(populateSpy).toHaveBeenCalledWith('createdBy', 'firstName lastName');

      assertResMock(200, returnValue, response, mockRes);
    });
  });

  describe('deleteactionItem function', () => {
    test('Returns 400 if any error occurs when finding an ActionItem', async () => {
      const { deleteactionItem } = makeSut();
      const errorMsg = 'Error when finding ActionItem';

      jest
        .spyOn(ActionItem, 'findById')
        .mockImplementationOnce(() => Promise.reject(new Error(errorMsg)));

      const response = await deleteactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 400 if no ActionItem is found', async () => {
      const { deleteactionItem } = makeSut();
      const errorMsg = {
        message: 'No valid records found',
      };

      jest.spyOn(ActionItem, 'findById').mockImplementationOnce(() => Promise.resolve(null));

      const response = await deleteactionItem(mockReq, mockRes);

      assertResMock(400, errorMsg, response, mockRes);
    });

    test('Returns 400 if any error occurs when deleting an ActionItem', async () => {
      const { deleteactionItem } = makeSut();
      const errorMsg = 'Error when removing ActionItem';

      jest
        .spyOn(ActionItem, 'findById')
        .mockReturnValueOnce({ remove: () => Promise.reject(new Error(errorMsg)) });

      const response = await deleteactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 400 if notificationdeleted method throws an error.', async () => {
      const errorMsg = 'Error occured in notificationdeleted method';

      notificationhelper.mockImplementationOnce(() => ({
        notificationdeleted: jest.fn(() => {
          throw new Error(errorMsg);
        }),
      }));

      const { deleteactionItem } = makeSut();

      jest
        .spyOn(ActionItem, 'findById')
        .mockReturnValueOnce({ remove: () => Promise.resolve(true) });

      const response = await deleteactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 200 if get actionItem successfully finds and removes the matching ActionItem', async () => {
      const message = { message: 'removed' };
      const notificationhelperObject = { notificationdeleted: () => {} };

      notificationhelper.mockImplementationOnce(() => notificationhelperObject);

      const notificationdeletedSpy = jest
        .spyOn(notificationhelperObject, 'notificationdeleted')
        .mockImplementationOnce(() => true);

      const { deleteactionItem } = makeSut();

      const findReturnObject = { remove: () => {} };

      const findSpy = jest.spyOn(ActionItem, 'findById').mockReturnValueOnce(findReturnObject);

      jest.spyOn(findReturnObject, 'remove').mockImplementationOnce(() => Promise.resolve(message));

      const response = await deleteactionItem(mockReq, mockRes);

      expect(notificationdeletedSpy).toHaveBeenCalledWith(
        mockReq.body.requestor.requestorId,
        mockReq.body.requestor.assignedTo,
        undefined,
      );

      expect(findSpy).toHaveBeenCalledWith(mongoose.Types.ObjectId(mockReq.params.actionItemId));

      assertResMock(200, message, response, mockRes);
    });
  });

  describe('editactionItem function', () => {
    test('Returns 400 if any error occurs when finding an ActionItem', async () => {
      const { editactionItem } = makeSut();
      const errorMsg = 'Error when finding ActionItem';

      jest
        .spyOn(ActionItem, 'findById')
        .mockImplementationOnce(() => Promise.reject(new Error(errorMsg)));

      const response = await editactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 400 if no ActionItem is found', async () => {
      const { editactionItem } = makeSut();
      const errorMsg = {
        message: 'No valid records found',
      };

      jest.spyOn(ActionItem, 'findById').mockImplementationOnce(() => Promise.resolve(null));

      const response = await editactionItem(mockReq, mockRes);

      assertResMock(400, errorMsg, response, mockRes);
    });

    test('Returns 400 if any error occurs when saving an edited ActionItem', async () => {
      const { editactionItem } = makeSut();
      const errorMsg = 'Error when saving ActionItem';

      jest
        .spyOn(ActionItem, 'findById')
        .mockReturnValueOnce({ save: () => Promise.reject(new Error(errorMsg)) });

      const response = await editactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 400 if notificationedited method throws an error.', async () => {
      const errorMsg = 'Error occured in notificationedited method';

      notificationhelper.mockImplementationOnce(() => ({
        notificationedited: jest.fn(() => {
          throw new Error(errorMsg);
        }),
      }));

      const { editactionItem } = makeSut();

      jest
        .spyOn(ActionItem, 'findById')
        .mockReturnValueOnce({ remove: () => Promise.resolve(true) });

      const response = await editactionItem(mockReq, mockRes);

      assertResMock(400, new Error(errorMsg), response, mockRes);
    });

    test('Returns 200 if get actionItem successfully finds and edits the matching ActionItem', async () => {
      const message = { message: 'Saved' };

      const notificationhelperObject = { notificationedited: () => {} };

      notificationhelper.mockImplementationOnce(() => notificationhelperObject);

      const notificationeditedSpy = jest
        .spyOn(notificationhelperObject, 'notificationedited')
        .mockImplementationOnce(() => true);

      const { editactionItem } = makeSut();

      mockReq.body.description = 'Any description';
      mockReq.body.assignedTo = null;

      const findReturnObject = { save: () => {} };

      const findSpy = jest.spyOn(ActionItem, 'findById').mockReturnValueOnce(findReturnObject);

      jest.spyOn(findReturnObject, 'save').mockImplementationOnce(() => Promise.resolve(message));

      const response = await editactionItem(mockReq, mockRes);

      expect(notificationeditedSpy).toHaveBeenCalledWith(
        mockReq.body.requestor.requestorId,
        mockReq.body.requestor.assignedTo,
        undefined,
        mockReq.body.description,
      );

      expect(findSpy).toHaveBeenCalledWith(mongoose.Types.ObjectId(mockReq.params.actionItemId));

      assertResMock(200, message, response, mockRes);
    });
  });
});
