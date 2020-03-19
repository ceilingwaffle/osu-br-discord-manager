console.debug("App starting...")

setTimeout(async () => {
  try {
    console.debug(`Started.`)
  } catch (e) {
    console.error(e)
  }
}, (2 ^ 32) - 1);

export {};
