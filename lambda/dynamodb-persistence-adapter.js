const { createAskSdkError } = require('ask-sdk-core');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');

function getUserId(requestEnvelope) {
  const userId = requestEnvelope
    && requestEnvelope.context
    && requestEnvelope.context.System
    && requestEnvelope.context.System.user
    && requestEnvelope.context.System.user.userId;

  if (!userId) {
    throw createAskSdkError(
      'DynamoDbPersistenceAdapterV3',
      'Cannot retrieve user id from request envelope!',
    );
  }

  return userId;
}

class DynamoDbPersistenceAdapterV3 {
  constructor({
    tableName,
    partitionKeyName = 'id',
    attributesName = 'attributes',
    partitionKeyGenerator = getUserId,
    documentClient,
  }) {
    if (!tableName) {
      throw createAskSdkError(
        'DynamoDbPersistenceAdapterV3',
        'A DynamoDB table name is required.',
      );
    }

    this.tableName = tableName;
    this.partitionKeyName = partitionKeyName;
    this.attributesName = attributesName;
    this.partitionKeyGenerator = partitionKeyGenerator;
    this.documentClient = documentClient || DynamoDBDocumentClient.from(
      new DynamoDBClient({}),
      {
        marshallOptions: {
          convertEmptyValues: true,
          removeUndefinedValues: true,
        },
      },
    );
  }

  async getAttributes(requestEnvelope) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);

    try {
      const data = await this.documentClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          [this.partitionKeyName]: attributesId,
        },
        ConsistentRead: true,
      }));

      return data.Item ? data.Item[this.attributesName] || {} : {};
    } catch (error) {
      throw createAskSdkError(
        this.constructor.name,
        `Could not read item (${attributesId}) from table (${this.tableName}): ${error.message}`,
      );
    }
  }

  async saveAttributes(requestEnvelope, attributes) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);

    try {
      await this.documentClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          [this.partitionKeyName]: attributesId,
          [this.attributesName]: attributes,
        },
      }));
    } catch (error) {
      throw createAskSdkError(
        this.constructor.name,
        `Could not save item (${attributesId}) to table (${this.tableName}): ${error.message}`,
      );
    }
  }

  async deleteAttributes(requestEnvelope) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);

    try {
      await this.documentClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          [this.partitionKeyName]: attributesId,
        },
      }));
    } catch (error) {
      throw createAskSdkError(
        this.constructor.name,
        `Could not delete item (${attributesId}) from table (${this.tableName}): ${error.message}`,
      );
    }
  }
}

module.exports = {
  DynamoDbPersistenceAdapterV3,
  getUserId,
};
