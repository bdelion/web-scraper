function asyncThing(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 100);
  });
}

async function map() {
  return [1, 2, 3, 4].map(async (value) => {
    const v = await asyncThing(value);
    return v * 2;
  });
}

map()
  .then((v) => Promise.all(v))
  .then((v) => console.log(v))
  .catch((err) => console.error(err));

async function filter() {
  return [1, 2, 3, 4].filter(async (value) => {
    const v = await asyncThing(value);
    return v % 2 === 0;
  });
}

filter()
  .then((v) => console.log(v))
  .catch((err) => console.error(err));

async function reduce() {
  return [1, 2, 3, 4].reduce(async (acc, value) => {
    return (await acc) + (await asyncThing(value));
  }, Promise.resolve(0));
}

reduce()
  .then((v) => console.log(v))
  .catch((err) => console.error(err));
