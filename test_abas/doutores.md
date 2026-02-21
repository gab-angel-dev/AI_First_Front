# Problemas identificados 

## 1

- No card para adicionar doutor tem o campo de preço que tem as setinhas para aumentar ou diminuir preço, porém elas adicionam 1 centavo(0,01). quero que adicione em 1 real(1,0)

## 2 

- Campo de restriçções no card de adicionar doutor só pode ser json, isso quebra a experiencia do admin, faça de um jeito mais amigável da mesma forma que fez com os outros campos de JSONB

## 3 

- no campo de convenio de a possibilidade do admin escrever convenios separados por ',' que ao adicionar seja fique dois distintos, pois no modelo atual ao escrevermos 'conevio1, convenio2' e clicar enter ele salva como: 'conevio1, convenio2'. Mas o correto seria: 'conevio1', 'convenio2'. Duas strings distintas

# 4

- No campo whatsapp onde o admin coloca o numero do doutor é preciso ter exatamente 12 digitos e começar com DDI 55. Valide isso