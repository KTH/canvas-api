# Canvas API (for TypeScript and JavaScript)

```shell
npm i @kth/canvas-api
```

Node.JS HTTP client (for both TypeScript and JavaScript) for the [Canvas LMS API](https://canvas.instructure.com/doc/api/)

## Getting Started

First, generate a token by going to `«YOUR CANVAS INSTANCE»/profile/settings`. For example https://canvas.kth.se/profile/settings. Then you can do something like:

```ts
import { CanvasApi } from "@kth/canvas-api";

console.log("Making a GET request to /accounts/1");
const canvas = new CanvasApi("<YOUR CANVAS INSTANCE>/api/v1", "<YOUR CANVAS TOKEN>");

const { json } = await canvas.get("accounts/1");
console.log(json);
```

## Features

### SIS Imports

### Pagination

### Type safety

### Error handling

## Design philosophy

