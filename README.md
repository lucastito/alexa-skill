# Autocuidado para Alexa

Skill pessoal em português do Brasil para organizar rotina, hidratação,
prioridades, tarefas recorrentes e lembretes. O backend usa Node.js 22 ou
superior, Alexa Skills Kit SDK, AWS SDK para JavaScript v3 e persistência no
DynamoDB.

## Recursos

- Plano diário com tarefas obrigatórias e opcionais.
- Registro e acompanhamento da meta de água.
- Tarefas personalizadas diárias ou recorrentes.
- Check-in de saída e chegada.
- Auditoria de tarefas concluídas e pendentes.
- Lembretes recorrentes pela API da Alexa.
- Persistência do histórico e das preferências.

## Estrutura

- `lambda/index.js`: lógica, intents, persistência e lembretes.
- `lambda/dynamodb-persistence-adapter.js`: persistência com AWS SDK v3.
- `lambda/dynamodb-persistence-adapter.test.js`: testes do adaptador.
- `lambda/package.json`: dependências do backend.
- `skill-package/interactionModels/custom/pt-BR.json`: modelo de voz.
- `skill-package/skill.json`: manifesto público com ARN de exemplo.
- `scripts/deploy-hosted.ps1`: validação de compatibilidade com Alexa-hosted.
- `scripts/validate-text-encoding.js`: validação de UTF-8.

## Instalação

Requer Node.js 22 ou superior, Git, ASK CLI v2 e uma função AWS Lambda moderna.

```powershell
cd lambda
npm ci
cd ..
Copy-Item ask-resources.example.json ask-resources.json
```

Edite o arquivo local `ask-resources.json` com o identificador da sua skill.
Esse arquivo é ignorado pelo Git.

Copie também o manifesto operacional para `skill-package/skill.local.json` e
substitua o ARN de exemplo pelo ARN real da função. O arquivo local é ignorado
pelo Git para não expor identificadores da conta AWS.

## Validação

```powershell
node .\scripts\validate-text-encoding.js
node --check .\lambda\index.js
cd lambda
npm test
npm run audit
```

## Hospedagem

A skill Alexa-hosted original usa Node.js 16.x. Esse runtime encerrou seu ciclo
de suporte e não aceita as versões atuais e corrigidas do AWS SDK v3. Por isso,
este repositório não publica automaticamente nesse ambiente antigo.

Use uma função AWS Lambda com Node.js 22 ou superior, instale as dependências
com `npm ci`, envie o conteúdo de `lambda/` e configure o ARN da função como
endpoint da skill no console da Alexa.

O script `scripts/deploy-hosted.ps1` consulta o runtime remoto e interrompe o
deploy antes de qualquer alteração quando a versão hospedada é incompatível.

## Exemplos de uso

- `Alexa, abrir autocuidado`
- `Alexa, plano de hoje`
- `Alexa, registrar água`
- `Alexa, 1 litro`
- `Alexa, vou sair`
- `Alexa, cheguei`
- `Alexa, status obrigatório`

## Licença

Distribuído sob a licença MIT.
