// const mongoose = require('mongoose');
const AIPrompt = require('../models/weeklySummaryAIPrompt');
const { mockReq, mockRes, assertResMock } = require('../test');
const UserProfile = require('../models/userProfile');

jest.mock('../utilities/emailSender');
const emailSender  = require('../utilities/emailSender');

jest.mock('../helpers/dashboardhelper');
const dashboardHelperClosure = require('../helpers/dashboardhelper');
const dashBoardController = require('./dashBoardController');

// mock the cache function before importing so we can manipulate the implementation
// jest.mock('../utilities/nodeCache');
// const cache = require('../utilities/nodeCache');
const makeSut = () => {
  const { 
    updateCopiedPrompt,
    getPromptCopiedDate, 
    updateAIPrompt, 
    getAIPrompt,
    monthlydata,
    weeklydata,
    leaderboarddata,
    orgData,
    dashboarddata,
    sendBugReport,
    sendMakeSuggestion,
    // getSuggestionOption
  } = dashBoardController(AIPrompt);
  return { 
    updateCopiedPrompt,
    getPromptCopiedDate,
    updateAIPrompt,
    getAIPrompt,
    monthlydata,
    weeklydata,
    leaderboarddata,
    orgData,
    dashboarddata,
    sendBugReport,
    sendMakeSuggestion,
    // getSuggestionOption
  };
};


const flushPromises = async () => new Promise(setImmediate);

describe('Dashboard Controller tests', () => {
  beforeAll(() => {
    // const dashboardHelperObject = 
    //   {
    //     laborthisweek: jest.fn(() => Promise.resolve([]))
    //   };
    // dashboardHelperClosure.mockImplementation(() => dashboardHelperObject);
  });
  beforeEach(() => {
    dashboardhelper = dashboardHelperClosure();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  const error = new Error('any error');


  describe('updateCopiedPrompt Tests', () => {
    test('Returns error 500 if the error occurs in the file update function', async () => {

      const { updateCopiedPrompt } = makeSut();
      
      jest
        .spyOn(UserProfile, 'findOneAndUpdate')
        .mockImplementationOnce(() =>
          Promise.reject(new Error('Error Occured in the findOneAndUpdate function')),
        );

      const response = await updateCopiedPrompt(mockReq, mockRes);

      assertResMock(
        500,
        new Error('Error Occured in the findOneAndUpdate function'),
        response,
        mockRes,
      );
    });

    test('Returns error 404 if the user is not found', async () => {

      const { updateCopiedPrompt } = makeSut();

      jest.
        spyOn(UserProfile, 'findOneAndUpdate')
        .mockImplementationOnce(() =>
          Promise.resolve(null)
        );

      const response = await updateCopiedPrompt(mockReq, mockRes);

      assertResMock(
        404,
        { message: "User not found " },
        response,
        mockRes,
      );
    });

    test('Returns 200 if there is no error and user is found', async () => {

      const { updateCopiedPrompt } = makeSut();

      jest
        .spyOn(UserProfile, 'findOneAndUpdate')
        .mockImplementationOnce(() => 
          Promise.resolve("Copied AI prompt")
        );

      const response = await updateCopiedPrompt(mockReq, mockRes);

      assertResMock(
        200,
        "Copied AI prompt",
        response,
        mockRes,
      );
    })

  });

  describe('getPromptCopiedDate', () => {
    test('Returns 200 if there is a user and return copied AI prompt',async () => {
      const mockUser = { _id: 'testUserId', copiedAiPrompt: 'Test Prompt'};

      const newReq = {
        ...mockReq,
        params: {
          userId: 'testUserId'
        }
      };

      const { getPromptCopiedDate } = makeSut();

      jest
        .spyOn(UserProfile, 'findOne')
        .mockResolvedValueOnce(mockUser);

      await getPromptCopiedDate(newReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ message: mockUser.copiedAiPrompt });
    });

    test('Returns undefined when the user is not found', async () => {

      const { getPromptCopiedDate } = makeSut(); 

      jest
        .spyOn(UserProfile, 'findOne')
        .mockResolvedValueOnce(null);

      getPromptCopiedDate(mockReq, mockRes);

      await flushPromises();

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    })
  })

  describe('updateAIPrompt Tests', () => {
    test('Returns error 500 if the error occurs in the AI Prompt function', async () => {
      const newRequest = {
        ...mockReq,
        body: {
          requestor: {
            role: 'Owner'
          }
        }
      };

      const { updateAIPrompt } = makeSut();

      jest
        .spyOn(AIPrompt, 'findOneAndUpdate')
        .mockImplementationOnce(() => Promise.reject(error));

      const response = updateAIPrompt(newRequest, mockRes);

      await flushPromises();

      assertResMock(
        500,
        error,
        response,
        mockRes,
      );
    });

    test('Returns 200 if there is no error and AI Prompt is saved', async () => {
      const newRequest = {
        ...mockReq,
        body: {
          requestor: {
            role: 'Owner'
          }
        }
      };

      const { updateAIPrompt } = makeSut();

      jest
        .spyOn(AIPrompt, 'findOneAndUpdate')
        .mockImplementationOnce(() => Promise.resolve("Successfully saved AI prompt."));

      const response = updateAIPrompt(newRequest, mockRes);

      await flushPromises();

      assertResMock(
        200,
        "Successfully saved AI prompt.",
        response,
        mockRes,
      );
    });

    test('Returns undefined if requestor role is not an owner', () => {
      const newRequest = {
        ...mockReq,
        body: {
          requestor: {
            role: 'Administrator'
          }
        }
      };
      const { updateAIPrompt } = makeSut();

      const mockFindOneAndUpdate = jest
        .spyOn(AIPrompt, 'findOneAndUpdate')
        .mockImplementationOnce(() => 
          Promise.resolve({undefined}),
        );
      
      const response = updateAIPrompt(newRequest, mockRes);

      expect(response).toBeUndefined();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
      expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
    });

  });

  describe('getAIPrompt Tests', () => {
    
    test('Returns 200 if the GPT exists and send the results back', async () => {

      const { getAIPrompt } = makeSut();

      jest
        .spyOn(AIPrompt,'findById')
        .mockImplementationOnce(() => Promise.resolve({}))

      const response = getAIPrompt(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        {},
        response,
        mockRes,
      )
    });

    test('Returns 200 if there is no error and new GPT Prompt is created', async () => {

      const { getAIPrompt } = makeSut();

      jest
        .spyOn(AIPrompt, 'findById')
        .mockResolvedValueOnce(null);

      jest
        .spyOn(AIPrompt, 'create')
        .mockImplementationOnce(() => Promise.resolve({}));

      const response = getAIPrompt(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200, 
        {}, 
        response, 
        mockRes,
        )
    });

    test('Returns 500 if GPT Prompt does not exist', async () => {

      const { getAIPrompt } = makeSut();
      const errorMessage = 'GPT Prompt does not exist';

      jest
        .spyOn(AIPrompt, 'findById')
        .mockRejectedValueOnce(new Error(errorMessage));

      const response = getAIPrompt(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        500,
        new Error(errorMessage),
        response,
        mockRes,
      );
    });

    test('Returns 500 if there is an error in creating the GPT Prompt', async () => {

      const { getAIPrompt } = makeSut();
      const errorMessage = 'Error in creating the GPT Prompt';

      jest
        .spyOn(AIPrompt, 'findById')
        .mockResolvedValueOnce(null);

      jest
        .spyOn(AIPrompt, 'create')
        .mockRejectedValueOnce(new Error(errorMessage));

      const response = getAIPrompt(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        500,
        new Error(errorMessage),
        response,
        mockRes,
      );
    }); 

  });

  describe('weeklydata Tests', () => {

    test('Returns 200 if there is no error and labordata is found', async () => {
      const dashboardHelperObject = 
      {
        laborthisweek: jest.fn(() => Promise.resolve([]))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { weeklydata } = makeSut();

      const response = weeklydata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        [],
        response,
        mockRes,
      );
    })
  });

  describe('monthlydata Tests', () => {

    test('Returns 200 if there is no results and return empty results', async () => {
      const dashboardHelperObject = {
        laborthismonth: jest.fn(() => Promise.resolve([{
          projectName: "",
          timeSpent_hrs: 0,
      }]))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { monthlydata } = makeSut();

      const response = monthlydata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        [{
            projectName: "",
            timeSpent_hrs: 0,
        }],
        response,
        mockRes,
      );
    })

    test('Returns 200 if there is results and return results', async () => {
      const dashboardHelperObject = {
        laborthismonth: jest.fn(() => Promise.resolve({}))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { monthlydata } = makeSut();

      const response = monthlydata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        {},
        response,
        mockRes,
      );
    })

  });

  describe('leaderboarddata Tests', () => {
    test('Returns 200 if there is leaderboard data', async () => {
      const dashboardHelperObject = {
        getLeaderboard: jest.fn(() => Promise.resolve({})),
        getUserLaborData: jest.fn(() => Promise.resolve({}))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { leaderboarddata } = makeSut();

      const response = leaderboarddata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        {},
        response,
        mockRes,
      );
    })

    test('Returns 200 if leaderboard data is empty and returns getUserLaborData', async () => {
      const dashboardHelperObject = {
        getLeaderboard: jest.fn(() => Promise.resolve([])),
        getUserLaborData: jest.fn(() => Promise.resolve([]))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { leaderboarddata } = makeSut();

      const response = leaderboarddata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        [],
        response,
        mockRes,
      );
    })

    test('Returns 400 if there is an error', async () => {
      const dashboardHelperObject = {
        getLeaderboard: jest.fn(() => Promise.reject({}))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { leaderboarddata } = makeSut();

      const response = leaderboarddata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        400,
        {},
        response,
        mockRes,
      );
    })
  })
  
  describe('orgData Tests', () => {
    
    test('Returns 400 if there is an error in the function', async () => {

      const dashboardHelperObject = {
        getOrgData: jest.fn(() => Promise.reject(error))
      };

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { orgData } = makeSut();

      const response = orgData(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        400,
        error,
        response,
        mockRes,
      );
    })

    test('Returns 200 if the result is found and returns result', async () => {
      const mockResult = { id: 1, name: 'Mock Results'};

      const dashboardHelperObject = {
        getOrgData: jest.fn(() => Promise.resolve([mockResult]))
      }

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { orgData } = makeSut();

      const response = orgData(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        mockResult,
        response,
        mockRes,
      );
    })
  });

  describe('dashboarddata Tests', () => {
    test('Returns 200 if there is no error and return results', async () => {

      const dashboardHelperObject = {
        personaldetails: jest.fn(() => Promise.resolve({}))
      }

      dashboardHelperClosure.mockImplementationOnce(() => dashboardHelperObject);

      const { dashboarddata } = makeSut();

      const response = dashboarddata(mockReq, mockRes);

      await flushPromises();

      assertResMock(
        200,
        {},
        response,
        mockRes,
      )
    })

  });
  
  describe('sendBugReport Tests', () => {

    test('Returns 200 if the bug report email is sent ', async () => {
      const mockReq = {
        body: {
          firstName: 'Lin',
          lastName: 'Test',
          title: 'Bug in feature X',
          environment: 'macOS 10.15, Chrome 89, App version 1.2.3',
          reproduction: '1. Click on button A\n2. Enter valid data\n3. Click submit',
          expected: 'The app should not display an error message',
          actual: 'The app',
          visual: 'Screenshot attached',
          severity: 'High',
          email: 'lin.test@example.com',
        },
      };

      const { sendBugReport } = makeSut();

      sendBugReport(mockReq, mockRes);

      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Success');
    })

    test('Returns 500 if the email fails to send', async () => {
      const mockReq = {
        body: {
          firstName: 'Lin',
          lastName: 'Test',
          title: 'Bug in feature X',
          environment: 'macOS 10.15, Chrome 89, App version 1.2.3',
          reproduction: '1. Click on button A\n2. Enter invalid data\n3. Click submit',
          expected: 'The app should display an error message',
          actual: 'The app',
          visual: 'Screenshot attached',
          severity: 'High',
          email: 'lin.test@example.com',
        },
      };

      emailSender.mockImplementation(() => {
        throw new Error('Failed to send email');
      });

      const { sendBugReport } = makeSut();

      sendBugReport(mockReq, mockRes);

      emailSender.mockRejectedValue(new Error('Failed'));

      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Failed');
    })

  })

  describe('sendMakeSuggestion Tests', () => {
    test('Returns 500 if the suggestion email fails to send', async () => {
      const mockReq = {
        body: {
          suggestioncate: 'Identify and remedy poor client and/or user service experiences',
          suggestion: 'This is a sample suggestion',
          confirm: 'true',
          email: 'test@example.com',
          firstName: 'Lin',
          lastName: 'Test',
          field: ['field1', 'field2'],
        },
      };
      
      emailSender.mockImplementation(() => {
        throw new Error('Failed');
      });

      const { sendMakeSuggestion } = makeSut();

      sendMakeSuggestion(mockReq, mockRes);

      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Failed');
    })

    test('Returns 200 if the suggestion email is sent successfully', async () => {
      const mockReq = {
        body: {
          suggestioncate: 'Identify and remedy poor client and/or user service experiences',
          suggestion: 'This is a sample suggestion',
          confirm: 'true',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          field: ['field1', 'field2'],
        },
      };

      emailSender.mockImplementation(() => {
        Promise.resolve();
      });
      
      const { sendMakeSuggestion } = makeSut();

      sendMakeSuggestion(mockReq, mockRes);

      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Success');
    })

  })

  // describe('getSuggestionOption Tests', () => {
  //   test.only('Returns 404 if the suggestion data is not found', async () => {
  //     const mockReq = {}
  //     dashBoardController.suggestionData = null;

  //     const { getSuggestionOption } = makeSut();

  //     await getSuggestionOption(mockReq, mockRes);

  //     await flushPromises();

  //     expect(mockRes.status).toBeCalledWith(200);
  //   })
  // })
});
