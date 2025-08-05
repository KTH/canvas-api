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
const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);

const { json } = await canvas.get("accounts/1");
console.log(json);
```

## Features

### SIS Imports

Use the method `.sisImport()`

```ts
import { CanvasApi } from "@kth/canvas-api";

const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);

const buffer = await readFile("<FILE PATH>");

// Note: you must give the file name with the correct extension
const file = new File([buffer], "test.csv");

const { json } = await canvas.sisImport(file);
console.log(json);
```

If you need to pass extra parameters to Canvas, create a `FormData` object and pass it as `body` to the `request()` method:

```ts
import { CanvasApi } from "@kth/canvas-api";

const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);

const buffer = await readFile("<FILE PATH>");
const file = new File([buffer], "test.csv");
const formData = new FormData();
formData.set("attachment", file);
formData.set("key", "value");

const { json } = await canvas.request(
  "accounts/1/sis_import",
  "POST",
  formData
);
console.log(json);
```

### Pagination

Use the method `.listPages` to automatically traverse pages.

```ts
import { CanvasApi } from "@kth/canvas-api";

const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);

const pages = canvas.listPages("accounts/1/courses");

for await (const { json } of pages) {
  console.log(json);
}
```

If the page returns a list of items, you can use `.listItems` to traverse through the items.

Note: the returned iterator does not include response headers

```ts
import { CanvasApi } from "@kth/canvas-api";

const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);

const courses = canvas.listItems("accounts/1/courses");

for await (const course of courses) {
  console.log(course);
}
```

### Type safety

This library parses JSON responses from Canvas and convert them as JavaScript object. If you want to check types in runtime, use a library like Zod:

```ts
import { CanvasApi } from "@kth/canvas-api";
import { z } from "zod";

const canvas = new CanvasApi(
  "<YOUR CANVAS INSTANCE>/api/v1",
  "<YOUR CANVAS TOKEN>"
);
const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  workflow_state: z.string(),
});

const { json } = client.get("accounts/1");
const parsed = accountSchema.parse(json);
```

### Error handling

This library returns instances of `CanvasApiError`. Check the [file `src/canvasApiError.ts`](./src/canvasApiError.ts) to see all the error classes that this library throws

## Development

### Dev-Env as code with `nix-shell`

We use nix package manager to get a consistent developer experience across devices (Linux/macOS):

- shell.nix -- equivalent of package.json but for system packages
- .nix/source.json -- equivalent of package-lock.json but pinned to a commit in the nix package repo

[Installing the Required Nix Tools](https://confluence.sys.kth.se/confluence/pages/viewpage.action?pageId=193409170) and setting up your editor. This page also contains instructions or pointers for how to set up your editor.

Run `nix-shell` in the root directory and it will install the required packages for the project. You won't need nvm or similar to switch Node.js version and you will get the correct version of Node.js, az, openssl, etc.

#### Setting up your own environment

The Nixpkgs-setup is a declarative configuration of the development environment. You can choose to install the packages manually on your local system.