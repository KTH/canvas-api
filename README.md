# Canvas API client

Node.JS HTTP client based on [got](https://github.com/sindresorhus/got) for the [Canvas LMS API](https://canvas.instructure.com/doc/api/)

[![Build Status](https://travis-ci.org/KTH/canvas-api.svg?branch=master)](https://travis-ci.org/KTH/canvas-api)

```shell
npm i @kth/canvas-api
```

1. [Usage](#usage)
2. [API reference](docs/API.md)

## Usage

```js
import CanvasApi from '@kth/canvas-api'

async function start() {
  const canvas = CanvasApi('https://kth.instructure.com/api/v1', 'XXXX~xxxx')
  const { body } = await canvas.get('/accounts/1')
}

start()
```

→ [See the full API here](docs/API.md)
