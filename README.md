# optimize-immutable-update

Optimize immutable updates.

- https://stackoverflow.com/questions/41298577/how-to-get-altered-tree-from-immutable-tree-maximising-reuse-of-nodes
- https://stackoverflow.com/questions/71455345/performance-of-programs-using-immutable-objects


## Installation

```shell
npm install optimize-immutable-update
```
or
```shell
yarn add optimize-immutable-update
```

## Usage

```ts
import optimizeImmutableUpdate from 'optimize-immutable-update'

const optimizedNextValue = optimizeImmutableUpdate(prevValue, nextValue)
```
