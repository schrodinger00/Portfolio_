/**
 * Deterministic LCG pseudo-random generator used for repeatable
 * organic textures, cotton-paper tooth, and copperplate striations.
 */
export function createSeededRand(initialSeed) {
  let seed = initialSeed;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
