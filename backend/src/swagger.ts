import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuizSpark API',
      version: '1.0.0',
      description: 'REST API for QuizSpark — quiz management, game sessions, and analytics.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local dev server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            username: { type: 'string', example: 'johndoe' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT token' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        AnswerOption: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string', example: 'Paris' },
            isCorrect: { type: 'boolean' },
            color: { type: 'string', example: '#26890c' },
          },
        },
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string', example: 'What is the capital of France?' },
            imageUrl: { type: 'string', nullable: true },
            timeLimit: { type: 'integer', example: 20 },
            points: { type: 'integer', example: 1000 },
            orderIndex: { type: 'integer' },
            options: { type: 'array', items: { $ref: '#/components/schemas/AnswerOption' } },
          },
        },
        Quiz: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Geography Quiz' },
            description: { type: 'string', nullable: true },
            isPublic: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
          },
        },
        GameSession: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            pin: { type: 'string', example: '493821' },
            status: { type: 'string', enum: ['WAITING', 'IN_PROGRESS', 'FINISHED'] },
            currentQuestionIndex: { type: 'integer' },
            quizId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      // ─── Health ──────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Server health check',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
          },
        },
      },

      // ─── Auth ─────────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user (sends OTP to email)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'username'],
                  properties: {
                    email: { type: 'string', example: 'user@example.com' },
                    username: { type: 'string', example: 'johndoe' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Account created, OTP sent', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, email: { type: 'string' } } } } } },
            409: { description: 'Email or username already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/request-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Request a login OTP (sent to registered email)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', example: 'user@example.com' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'OTP sent (always 200 to avoid email enumeration)', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, email: { type: 'string' } } } } } },
          },
        },
      },
      '/api/auth/verify-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Verify OTP and receive a JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: {
                    email: { type: 'string', example: 'user@example.com' },
                    otp: { type: 'string', example: '482931', description: '6-digit code from email' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid or expired code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get the current authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ─── Quizzes ──────────────────────────────────────────────
      '/api/quizzes': {
        get: {
          tags: ['Quizzes'],
          summary: 'List all public quizzes',
          responses: {
            200: { description: 'Array of quizzes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Quiz' } } } } },
          },
        },
        post: {
          tags: ['Quizzes'],
          summary: 'Create a new quiz',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'questions'],
                  properties: {
                    title: { type: 'string', example: 'Science Quiz' },
                    description: { type: 'string' },
                    isPublic: { type: 'boolean', default: true },
                    questions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text: { type: 'string' },
                          timeLimit: { type: 'integer', default: 20 },
                          points: { type: 'integer', default: 1000 },
                          options: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                text: { type: 'string' },
                                isCorrect: { type: 'boolean' },
                                color: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Quiz created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Quiz' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/quizzes/my': {
        get: {
          tags: ['Quizzes'],
          summary: 'Get quizzes created by the current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'My quizzes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Quiz' } } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/quizzes/{id}': {
        get: {
          tags: ['Quizzes'],
          summary: 'Get a single quiz by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Quiz found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Quiz' } } } },
            404: { description: 'Quiz not found' },
          },
        },
        put: {
          tags: ['Quizzes'],
          summary: 'Update a quiz',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Quiz' } } } },
          responses: {
            200: { description: 'Quiz updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Quiz' } } } },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
          },
        },
        delete: {
          tags: ['Quizzes'],
          summary: 'Delete a quiz',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Deleted' },
            403: { description: 'Forbidden' },
          },
        },
      },

      // ─── Sessions ─────────────────────────────────────────────
      '/api/sessions': {
        post: {
          tags: ['Sessions'],
          summary: 'Create a new game session (generates a PIN)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['quizId'],
                  properties: { quizId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Session created', content: { 'application/json': { schema: { $ref: '#/components/schemas/GameSession' } } } },
            403: { description: 'Forbidden — not the quiz owner' },
            404: { description: 'Quiz not found' },
          },
        },
        get: {
          tags: ['Sessions'],
          summary: 'List sessions created by the current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Sessions list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GameSession' } } } } },
          },
        },
      },
      '/api/sessions/{id}': {
        get: {
          tags: ['Sessions'],
          summary: 'Get a single session by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Session found', content: { 'application/json': { schema: { $ref: '#/components/schemas/GameSession' } } } },
            404: { description: 'Not found' },
          },
        },
      },

      // ─── Analytics ────────────────────────────────────────────
      '/api/analytics/quiz/{quizId}': {
        get: {
          tags: ['Analytics'],
          summary: 'Get analytics for a quiz (all sessions combined)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'quizId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Analytics data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      quiz: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } },
                      totalSessions: { type: 'integer' },
                      totalPlayers: { type: 'integer' },
                      questions: { type: 'array', items: { type: 'object' } },
                      recentSessions: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/analytics/session/{sessionId}': {
        get: {
          tags: ['Analytics'],
          summary: 'Get analytics for a specific game session',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Session analytics', content: { 'application/json': { schema: { type: 'object' } } } },
            404: { description: 'Session not found' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
