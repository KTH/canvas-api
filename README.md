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

## Concepts

### 🆕 New from v4. SIS Imports

This package implements one function to perform SIS Imports (i.e. call the [POST sis_imports] endpoint).

> Note: this is the only function that calls a **specific** endpoint. For other endpoints you should use `canvas.get`, `canvas.requestUrl`, `canvas.listItems` and `canvas.listPages`

[post sis_imports]: https://canvas.instructure.com/doc/api/sis_imports.html#method.sis_imports_api.create

### `listItems` and `listPages`

This package does have pagination support which is offered in two methods: `listItems` and `listPages`. Let's see an example by using the `[GET /accounts/1/courses]` endpoint.

If you want to get all **pages** you can use `listPages`:

```js
const canvas = new Canvas(canvasApiUrl, canvasApiToken);

const pages = canvas.listPages("accounts/1/courses");

// Now `pages` is an iterator that goes through every page
for await (const coursesResponse of pages) {
  // `courses` is the Response object that contains a list of courses
  const courses = coursesResponse.body;

  for (const course of courses) {
    console.log(course.id, course.name);
  }
}
```

To avoid writing two `for` loops like above, you can call `listItems`, that iterates elements instead of pages. The following code does exactly the same as before. Note that in this case, you will not have the `Response` object:

```js
const canvas = new Canvas(canvasApiUrl, canvasApiToken);

const courses = canvas.listItems("accounts/1/courses");

// Now `courses` is an iterator that goes through every course
for await (const course of courses) {
  console.log(course.id, course.name);
}
```

[get /accounts/1/courses]: https://canvas.instructure.com/doc/api/accounts.html#method.accounts.courses_api

### Typescript support

This package does not contain type definitions to the objects returned by Canvas. If you want such types, you must define them yourself and pass it as type parameter to the methods in this library.

For example, to get typed "account" objects:

```ts
// First you define the "Account" type (or interface)
// following the Canvas API docs: https://canvas.instructure.com/doc/api/accounts.html
interface CanvasAccount {
  id: number;
  name: string;
  workflow_state: string;
}

// Then, you can call our methods by passing your custom type as type parameter
const { body } = await canvas.get<CanvasAccount>("accounts/1");

console.log(body);
```

### Error handling

By default, this library throws `CanvasApiError` exceptions when it gets a non-200 HTTP response from the Canvas API. You can catch those exceptions with any of the methods:

```ts
const canvas = new Canvas(canvasApiUrl, "-------");
const pages = canvas.listPages("accounts/1/courses");

try {
  for await (const coursesResponse of pages) {
    const courses = coursesResponse.body;

    for (const course of courses) {
      console.log(course.id, course.name);
    }
  }
} catch (err) {
  if (err instanceof CanvasApiError) {
    console.log(err.options.url);
    console.log(err.response.statusCode);
    console.log(err.message);
  }
}
```

#### Shorter error objects

By default, `CanvasApiError` thrown by this library contains a property `response` with a very big object. If you would like to have a smaller `response` in the error object, you can modify the `errorHandler` property:

```ts
import CanvasApi, { minimalErrorHandler } from "@kth/canvas-api";
const canvas = new CanvasApi("...");
canvas.errorHandler = minimalErrorHandler;
```

#### Custom error objects

You can also pass a custom function in the `.errorHandler` property: that function will be called with whatever is thrown by `got`. Read more about [errors in Got here](https://github.com/sindresorhus/got/blob/main/documentation/8-errors.md)

Notes:

- Argument `err` in the custom handler will be the error thrown by `got`, so it will never be `CanvasApiError`
- Make sure the function you pass never returns something.

You can use this function to create your own error objects:

```ts
import CanvasApi from "@kth/canvas-api";

const canvas = new CanvasApi("...");

canvas.errorHandler = function customHandler(err: unknown): never {
  if (err instanceof HTTPError) {
    throw new CustomError(`Oh! An error! ${err.message}`);
  }

  throw err;
};
```

## Design philosophy

1. **Do not implement every endpoint**. This package does **not** implement every endpoint in Canvas API This package also does not implement type definitions for objects returned by any endpoint nor definition for parameters. That would make it unmaintainable.

2. **Offer "lower-level" API** instead of trying to implement every possible feature, expose the "internals" to make it easy to extend.

   Example: you can use `.client` to get the `Got` instance that is used internally. With such object, you have access to all options given by the library [got](https://github.com/sindresorhus/got)
