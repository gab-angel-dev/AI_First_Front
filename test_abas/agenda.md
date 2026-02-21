# Melhorias

## 1 

Na parte de agendar tem que ter uma opção de escolher o convenio tambem pois está sendo enviado isso sem o convenio:

🔔 *Novo Agendamento Realizado*

👤 Paciente: Gabriel Angel dos Santos Sousa
📞 Telefone: 557998760230
📅 Data: 21/02/2026
🕐 Horário: 09:19 às 09:49
Convênio: Não informado
Procedimento: Consulta Inicial
Observações: Agendado pelo painel admin

Verifique a agenda ou entre em contato.

## 2 

Verificar tambem a questão do google api que as vezes funciona o agendamento e as vezes não, bem estranho isso:

POST /api/admin/agenda: GaxiosError: request to https://oauth2.googleapis.com/token failed
config: {
    retry: true,
    retryConfig: {
      httpMethodsToRetry: [Array],
      currentRetryAttempt: 2,
      retry: 3,
      noResponseRetries: 2,
      retryDelayMultiplier: 2,
      timeOfFirstRequest: 1771679327308,
      totalTimeout: 9007199254740991,
      maxRetryDelay: 9007199254740991,
      statusCodesToRetry: [Array]
    },
    method: 'POST',
    url: URL {
      href: 'https://oauth2.googleapis.com/token',
      origin: 'https://oauth2.googleapis.com',
      protocol: 'https:',
      username: '',
      password: '',
      host: 'oauth2.googleapis.com',
      hostname: 'oauth2.googleapis.com',
      port: '',
      pathname: '/token',
      search: '',
      searchParams: URLSearchParams {},
      hash: ''
    },
    data: URLSearchParams {
      'refresh_token' => '',
      'client_id' => '',
      'client_secret' => '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.',
      'grant_type' => '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.' },
    body: URLSearchParams {
      'refresh_token' => '',
      'client_id' => '',
      'client_secret' => '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.',
      'grant_type' => '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.' },
    validateStatus: [Function: validateStatus],
    responseType: 'unknown',
    errorRedactor: [Function: defaultErrorRedactor],
    duplex: 'half',
    headers: Headers {
      'x-goog-api-client': 'gl-node/22.16.0',
      'User-Agent': 'google-api-nodejs-client/10.5.0'
    }
  },
  response: undefined,
  code: 'ETIMEDOUT',
  status: undefined,
  error: FetchError: request to https://oauth2.googleapis.com/token failed, reason: 
      at ClientRequest.eval (webpack-internal:///(rsc)/./node_modules/node-fetch/src/index.js:135:11)
      at ClientRequest.emit (node:events:530:35)
      at emitErrorEvent (node:_http_client:104:11)
      at TLSSocket.socketErrorListener (node:_http_client:518:5)
      at TLSSocket.emit (node:events:518:28)
      at emitErrorNT (node:internal/streams/destroy:170:8)
      at emitErrorCloseNT (node:internal/streams/destroy:129:3)
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    type: 'system',
    errno: 'ETIMEDOUT',
    code: 'ETIMEDOUT',
    erroredSysCall: undefined
  },
  [Symbol(gaxios-gaxios-error)]: '7.1.3',
  [cause]: FetchError: request to https://oauth2.googleapis.com/token failed, reason: 
      at ClientRequest.eval (webpack-internal:///(rsc)/./node_modules/node-fetch/src/index.js:135:11)
      at ClientRequest.emit (node:events:530:35)
      at emitErrorEvent (node:_http_client:104:11)
      at TLSSocket.socketErrorListener (node:_http_client:518:5)
      at TLSSocket.emit (node:events:518:28)
      at emitErrorNT (node:internal/streams/destroy:170:8)
      at emitErrorCloseNT (node:internal/streams/destroy:129:3)
      at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
    type: 'system',
    errno: 'ETIMEDOUT',
    code: 'ETIMEDOUT',
    erroredSysCall: undefined
  }

 POST /api/admin/agenda 500 in 4475ms

## 3 

Não pode de maneira alguma poder agendar para o passado, e no sitema tem como tire isso

## 4

O botão de verificar disponibilidade precisa dar feedback ao ser acionado, quando clicamos nele ele continua da mesma forma parecendo que não foi clidado, coloque algum feedback de carregando

## 5 

Verificar a questão do escheduler não estar funcionando nem para adicionar lembrete nem para deletar:
Scheduler erro 404: {"detail":"Not Found"}

e o env está preenchido corretamente

## IMPLEMENTAR LÓGICA DE WEBHOOK SCHEDULER 

Para ouvir as requisições quando o scheduler disparar, alogo parecido com isso:

``
@app.post('/scheduler')
async def scheduler_webhook(request: Request):
    
    try:
        payload = await request.json()
        
        print(f'\n{"="*60}')
        print(f'🔔 SCHEDULER DISPAROU - Enviando mensagem')
        print(f'{"="*60}')
        print(f'Payload recebido: {payload}')
        
        # Extrai os dados do payload
        numero = payload.get('numero')
        mensagem = payload.get('mensagem')
        
        if not numero or not mensagem:
            print('❌ Payload inválido: número ou mensagem ausente')
            raise HTTPException(status_code=400, detail='Número e mensagem são obrigatórios')
        
        print(f'📱 Número: {numero}')
        print(f'💬 Mensagem: {mensagem}')
        
        evo = EvolutionAPI()

        sender_message = evo.sender_text(
            number=numero,
            text=mensagem
        )

        if sender_message:
            message_payload = {'type': 'ai', 'content': mensagem}

            PostgreSQL.save_message(session_id=numero, message=message_payload)
            
            print('✅  Mensagem de Lembrete Salva no Banco')


        print(f'✅ Mensagem enviada com sucesso para {numero}!')
        print(f'{"="*60}\n')
        
        return JSONResponse(
            content={
                'status': 'enviado',
                'numero': numero
            },
            status_code=200
        )
        
    except Exception as e:
        print(f'❌ Erro ao processar webhook do scheduler: {e}')
        raise HTTPException(status_code=500, detail=str(e))
``

Mas aí está em python e vc faz em type script