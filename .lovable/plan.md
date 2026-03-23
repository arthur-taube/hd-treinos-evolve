## Análise e Plano: Fallback substituto_custom_id



### 2. Fallback para `substituto_custom_id`

**Resposta direta**: Não, o fallback para `substituto_custom_id` **não está implementado** no sistema avançado. A cadeia de identificação no ARA e em outros pontos do código avançado usa apenas:

```
card_original_id → exercicio_original_id
```

Mas no sistema iniciante, a cadeia completa é:

```
card_original_id → exercicio_original_id → substituto_custom_id
```

Isso afeta:

- `saveARAFeedback` — ao buscar a próxima instância para ajustar séries
- `saveObservation` — ao replicar observações para exercícios futuros
- `usePreviousSeriesAdvanced` — ao buscar histórico (este já tem o fallback correto)
- `useEpleyProgression` — ao buscar dados para cálculo de progressão

**Correção**: Adicionar o terceiro nível de fallback (`substituto_custom_id`) em `saveARAFeedback` e `saveObservation` dentro de `useExerciseActionsAdvanced.ts`.

### Arquivos alterados


| Arquivo                         | Mudança                                                                            | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------ | ------ | ------ | ------ |
| &nbsp;                          | &nbsp;                                                                             | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
| `useExerciseActionsAdvanced.ts` | Adicionar fallback `substituto_custom_id` em `saveARAFeedback` e `saveObservation` | &nbsp; | &nbsp; | &nbsp; | &nbsp; |
