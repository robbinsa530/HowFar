// Used by the elevation profile chart to merge arrays (sort of)
/*
- Takes in 2 arrays (each containing [x (distance), y (elevation)] points as inner arrays)
- Outputs 2 arrays where each contains all X values (sorted) from
   itself and the other array with nulls for the y when an array didn't
   already contain the X in question.
  Stops once it reaches the end of the shorter array (that is the array
   with the smaller max X value, not necessarily the least elements).
*/

export function mergeFill(arr1, arr2) {
  let i = 0, j = 0;
  const result1 = [];
  const result2 = [];

  while (i < arr1.length || j < arr2.length) {
    if (i >= arr1.length) {
      return [result1, [...result2, ...arr2.slice(j)]];
    }
    if (j >= arr2.length) {
      return [[...result1, ...arr1.slice(i)], result2];
    }

    const x1 = arr1[i][0];
    const x2 = arr2[j][0];
    if (x1 === x2) {
      // both arrays have this x
      result1.push([x1, arr1[i][1]]);
      result2.push([x2, arr2[j][1]]);
      i++; j++;
    } else if (x1 < x2) {
      // arr1 has an x missing in arr2
      result1.push([x1, arr1[i][1]]);
      result2.push([x1, null]);
      i++;
    } else {
      // arr2 has an x missing in arr1
      result1.push([x2, null]);
      result2.push([x2, arr2[j][1]]);
      j++;
    }
  }

  return [result1, result2];
}
