# Caixa d'Água Card

Card para o Home Assistant que mostra o **nível de uma caixa d'água em tempo real**, com a água subindo e descendo dentro de uma imagem realista.

![Prévia](https://raw.githubusercontent.com/DELACROZ/caixa-dagua-card/main/docs/preview.png)

Feito por **[Marcelo Automações GO](https://marceloautomacoesgo.com.br)** — telemetria e automação em Caldas Novas e região.

## Tipos de caixa

| `tipo` | Imagem |
|---|---|
| `caixa` | Tanque metálico |
| `reservatorio` | Reservatório (container) |
| `plastica` | Caixa plástica |
| `subterranea` | Caixa subterrânea |

## Instalação

### Pelo HACS (recomendado)

1. HACS → menu ⋮ → **Repositórios personalizados**
2. Cole a URL deste repositório e escolha a categoria **Dashboard**
3. Procure **Caixa d'Água Card** → **Baixar**
4. Recarregue o navegador (Ctrl+F5)

### Manual

1. Copie **todo o conteúdo** da pasta `dist/` (o `.js` e as 4 imagens) para `/config/www/caixa-dagua/`
2. Configurações → Painéis → ⋮ → **Recursos** → Adicionar recurso:
   `/local/caixa-dagua/caixa-dagua-card.js` (tipo **Módulo JavaScript**)

## Uso

Adicionar card → **Caixa d'Água**. O editor visual deixa escolher tudo:

- **Sensor de nível (%)** — qualquer `sensor`, `number` ou `input_number` de 0 a 100
- **Tipo de caixa**
- **Nome** (opcional — padrão: nome do sensor)
- **Mostrar status online/offline**
- **Switches liga/desliga** (opcional) — um ou mais botões embaixo da caixa (bomba, registro…), cada um com o nome que você quiser

Ou em YAML:

```yaml
type: custom:caixa-dagua-card
entity: sensor.nivel_caixa_superior
tipo: subterranea
name: Caixa Superior
mostrar_status: true
switches:            # opcional
  - entity: switch.bomba_recalque
    name: Bomba        # opcional (padrão: nome da entidade)
  - entity: switch.registro
    name: Registro
```

## Comportamento

- A água anima suavemente a cada mudança do sensor.
- Sensor `unavailable`/`unknown`: a água fica cinza e aparece **Offline**.
- Clique na imagem para abrir o histórico do sensor.
- Switches: verde = ligado, vermelho = desligado, cinza = indisponível. Pede confirmação antes de ligar/desligar.
- Com switches, deixe a **altura do card em automática** (padrão, aba Layout do editor): o card cresce pra baixo e a imagem fica sempre do mesmo tamanho. Com altura fixa, a imagem encolhe pra caber.
- O formato antigo (`- switch.bomba`, só a entidade) continua funcionando.
- Redimensionável na view de seções: a imagem acompanha o tamanho do card.

## Licença

[MIT](LICENSE)
