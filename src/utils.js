export function augmentGenerator(generator) {
  return Object.assign(generator, {
    async toArray() {
      const result = [];

      for await (const v of generator) {
        result.push(v);
      }

      return result;
    },
  });
}
