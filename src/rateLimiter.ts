import { URL, UrlObject } from "url";
import { request as _request } from "undici";
import type { Dispatcher } from "undici";

type TRateLimitWorkItem = [
  (value: Dispatcher.ResponseData) => void,
  (err: unknown) => void,
  () => Promise<Dispatcher.ResponseData>,
  number
];

type TReadOnlyRateLimiterFactoryOptions = {
  limitIntervalMs: number;
};

export function rateLimitedRequestFactory({
  limitIntervalMs,
}: TReadOnlyRateLimiterFactoryOptions) {
  const _pendingWorkItems: TRateLimitWorkItem[] = [];
  let _callCounter = 0;
  let _isIdle = true;
  let _nextDelay = 0;
  let _intervalPeriodStart = 0;

  const _setDelayToStartAtNextInterval = () => {
    // Limit reached, wait until period is over
    // TODO: Consider logging rate limit issues
    const delta = Date.now() - _intervalPeriodStart;
    const calcDelay = limitIntervalMs - delta;
    if (_nextDelay < calcDelay) {
      _nextDelay = calcDelay;
    }
    // console.debug(`Bouncing on rate limiter: ${delta}`);
  };

  const _checkAndResetInterval = () => {
    const delta = Date.now() - _intervalPeriodStart;

    if (delta > limitIntervalMs) {
      // Reset interval every 1000ms
      _intervalPeriodStart = Date.now();
      _nextDelay = 0;
      // console.debug(`Reset limiter: ${_nextDelay} (${delta})`);
      return;
    }
  };

  const _getCallCounter = () => {
    _callCounter =
      _callCounter >= Number.MAX_SAFE_INTEGER ? 1 : _callCounter + 1;
    return _callCounter;
  };

  const request = (
    url: string | URL | UrlObject,
    {
      method,
      headers,
      body,
      signal,
    }: Omit<Dispatcher.RequestOptions, "origin" | "path" | "method"> &
      Partial<Pick<Dispatcher.RequestOptions, "method">>
  ): Promise<Dispatcher.ResponseData> => {
    return new Promise((resolve, reject) => {
      _pendingWorkItems.push([
        resolve,
        reject,
        async () => await _request(url, { method, headers, body, signal }),
        _getCallCounter(),
      ]);

      // We need to wrap the work loop in a function so we can restart it
      // when we get 429 (rate limit) from server
      const startWorkLoop = async () => {
        // If the rate limiter is idle we need to start it
        if (_isIdle) {
          _isIdle = false;
          _intervalPeriodStart = Date.now();

          // console.debug("Work loop started...");
          let currentWorkItem: TRateLimitWorkItem;
          try {
            // This is the main loop
            while (_pendingWorkItems.length > 0) {
              if (_nextDelay > 0) {
                await new Promise((waitResolve) => {
                  setTimeout(waitResolve, _nextDelay);
                });
              }
              _checkAndResetInterval();

              currentWorkItem = _pendingWorkItems.shift()!;
              const [workResolve, workReject, workFn, _idCounter] =
                currentWorkItem;
              workFn()
                .then(async (res: Dispatcher.ResponseData) => {
                  if (res?.statusCode === 403) {
                    const text = await res.body.text();
                    if (text.includes("Rate Limit Exceeded")) {
                      // console.debug(`...429 call ${_idCounter}, delay: ${_nextDelay}, ${Date.now() - _intervalPeriodStart}, -- ${_isIdle ? "IDLE" : "RUNNING"}`);
                      // Return the work item to the stack for retry
                      // WARNING: Don't use currentWorkItem, it is mutated when iterating through the while loop
                      _pendingWorkItems.unshift([
                        workResolve,
                        workReject,
                        workFn,
                        _idCounter,
                      ]);
                      _setDelayToStartAtNextInterval();
                      startWorkLoop();
                      return;
                    }

                    // reading res.body.text() above consumes the stream so we need to add it
                    // to allow `async parseBody(response: Dispatcher.ResponseData)` to fetch
                    // the content
                    res.body.text = async () => text;
                  }
                  // console.debug(`+++200 call ${_idCounter}, delay: ${_nextDelay}, ${Date.now() - _intervalPeriodStart}, -- ${_isIdle ? "IDLE" : "RUNNING"}`);
                  workResolve(res);
                })
                .catch(workReject);
            }
          } catch (err) {
            if (currentWorkItem! !== undefined) {
              // This is a programming error specific to this call. The loop while continue
              // to avoid weird side effects, but we need to fail this call.
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const [_workResolve, workReject, _workFn, _idCounter] =
                currentWorkItem;
              workReject(currentWorkItem);
            }
          } finally {
            _isIdle = true;
            // console.debug("...work loop stopped");
          }
        }
      };
      // I am starting this after a tick to ensure that multiple calls (such as with map)
      // are executed with a single start of the loop. This makes it more obvious that
      // the loop is working as intended and not started from multiple places.
      setTimeout(() => startWorkLoop(), 0);
    });
  };

  return request;
}
