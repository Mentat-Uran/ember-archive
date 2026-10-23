# Question Core

Dependency-free JavaScript rules shared by the Ember Archive browser game and
the STS2 mod's question-bank packaging step. The canonical implementation is
`index.js`; consumers should pin the source repository commit they build from.

The core applies answer-review records, extracts and compares answer indices,
and checks whether a question is eligible for scored play. Consumers can set
`singleAnswerOnly: true` to exclude every multi-answer item.
