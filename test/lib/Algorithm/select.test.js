/* global describe, it */
/* eslint-disable global-require, import/no-extraneous-dependencies */

const expect = require('chai').expect;

const randomInteger = require('../../utils/randomInteger');
const repeatFunction = require('../../utils/repeatFunction');

describe('Algorithm#select', () => {
  const Algorithm = require('../../../index');

  const arms = randomInteger(2, 10);
  const config = {
    arms
  };

  it('returns a number', () => {
    const alg = new Algorithm(config);

    return alg.select().then((arm) => {
      expect(arm).to.be.a('number');
    });
  });

  it('returns a valid arm', () => {
    const alg = new Algorithm(config);
    alg.counts = Array(arms).fill(1);

    const trials = new Array(randomInteger(10, 20)).fill(-1);

    return Promise.all(trials.map(() => alg.select())).then((selections) => {
      expect(selections.length).to.equal(trials.length);

      selections.forEach((choice) => {
        expect(choice).to.be.a('number');
        expect(choice).to.be.below(arms);
      });
    });
  });

  it('if there is one empty arm, returns that empty arm', async () => {
    const emptyArm = randomInteger(0, arms - 1);
    const counts = Array(arms).fill(1).map((count, idx) => (idx === emptyArm ? 0 : count));
    const alg = new Algorithm(config);
    alg.counts = counts;

    const arm = await alg.select();

    expect(arm).to.equal(emptyArm);
  });

  it('randomly selects an empty arm when more than one', async () => {
    const emptyArms = new Set();
    const emptyArmCount = randomInteger(2, arms);
    while (emptyArms.size < emptyArmCount) {
      emptyArms.add(randomInteger(0, arms - 1));
    }
    const counts = Array(arms).fill(1).map((count, idx) => (emptyArms.has(idx) ? 0 : count));
    const alg = new Algorithm(config);
    alg.counts = counts;

    const trials = new Array(50).fill(-1);
    const selections = await Promise.all(trials.map(() => alg.select()));
    const selectedArms = new Set(selections);

    selectedArms.forEach((arm) => {
      expect(arm).to.be.a('number');
      expect(arm).to.be.below(arms);
    });
    expect(selectedArms.size).to.be.greaterThan(1);
  });

  it('initially explores all available arms', () => {
    const alg = new Algorithm(config);
    const tasks = [];

    repeatFunction(arms)(
      () => {
        tasks.push(() => alg.select().then(arm => alg.reward(arm, randomInteger(0, 100) / 100)));
      }
    );

    return tasks.reduce((accum, task) => accum.then(task), Promise.resolve())
    .then(() => {
      alg.counts.forEach((ct) => {
        expect(ct).to.equal(1);
      });
    });
  });

  it('begins to exploit best arm (first)', () => {
    const alg = new Algorithm(config);
    const tasks = [];

    repeatFunction(arms * 10)(
      () => {
        tasks.push(() => alg.select().then(arm => alg.reward(arm, arm === 0 ? 1 : 0)));
      }
    );

    return tasks.reduce((accum, task) => accum.then(task), Promise.resolve())
    .then(() => {
      const bestCt = alg.counts[0];

      alg.counts.slice(1).forEach((ct) => {
        expect(ct).to.be.below(bestCt);
      });
    });
  });

  it('begins to exploit best arm (last)', () => {
    const alg = new Algorithm(config);
    const tasks = [];

    repeatFunction(arms * 10)(
      () => {
        tasks.push(() => alg.select().then(arm => alg.reward(arm, arm === (arms - 1) ? 1 : 0)));
      }
    );

    return tasks.reduce((accum, task) => accum.then(task), Promise.resolve())
    .then(() => {
      const bestCt = alg.counts[arms - 1];

      alg.counts.slice(0, -1).forEach((ct) => {
        expect(ct).to.be.below(bestCt);
      });
    });
  });
});
