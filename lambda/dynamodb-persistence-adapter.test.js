const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DeleteCommand,
  GetCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');
const {
  DynamoDbPersistenceAdapterV3,
  getUserId,
} = require('./dynamodb-persistence-adapter');

const requestEnvelope = {
  context: {
    System: {
      user: {
        userId: 'user-123',
      },
    },
  },
};

function createAdapter(responses = []) {
  const commands = [];
  const documentClient = {
    async send(command) {
      commands.push(command);
      const response = responses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return response || {};
    },
  };

  return {
    adapter: new DynamoDbPersistenceAdapterV3({
      tableName: 'skill-table',
      documentClient,
    }),
    commands,
  };
}

test('gera a mesma chave de usuário do adaptador anterior', () => {
  assert.equal(getUserId(requestEnvelope), 'user-123');
  assert.throws(() => getUserId({}), /Cannot retrieve user id/);
});

test('lê atributos persistidos com consistência forte', async () => {
  const { adapter, commands } = createAdapter([
    { Item: { id: 'user-123', attributes: { water: 1000 } } },
  ]);

  assert.deepEqual(await adapter.getAttributes(requestEnvelope), { water: 1000 });
  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof GetCommand);
  assert.deepEqual(commands[0].input, {
    TableName: 'skill-table',
    Key: { id: 'user-123' },
    ConsistentRead: true,
  });
});

test('retorna objeto vazio quando o usuário ainda não possui item', async () => {
  const { adapter } = createAdapter([{}]);
  assert.deepEqual(await adapter.getAttributes(requestEnvelope), {});
});

test('salva atributos no formato já usado pela tabela', async () => {
  const { adapter, commands } = createAdapter();
  const attributes = { water: 1500, tasks: [] };

  await adapter.saveAttributes(requestEnvelope, attributes);

  assert.ok(commands[0] instanceof PutCommand);
  assert.deepEqual(commands[0].input, {
    TableName: 'skill-table',
    Item: {
      id: 'user-123',
      attributes,
    },
  });
});

test('exclui atributos usando a mesma chave de partição', async () => {
  const { adapter, commands } = createAdapter();
  await adapter.deleteAttributes(requestEnvelope);

  assert.ok(commands[0] instanceof DeleteCommand);
  assert.deepEqual(commands[0].input, {
    TableName: 'skill-table',
    Key: { id: 'user-123' },
  });
});

test('converte falhas do DynamoDB em erros do ASK SDK', async () => {
  const { adapter } = createAdapter([new Error('network unavailable')]);
  await assert.rejects(
    adapter.getAttributes(requestEnvelope),
    /Could not read item \(user-123\).*network unavailable/,
  );
});
