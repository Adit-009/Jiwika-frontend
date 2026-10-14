import { calculateDistance, isValidCoordinate } from "./utils.ts";

console.log("Running frontend utils unit tests...");

// 1. Same location -> 0 km
const sameLoc = calculateDistance(26.1445, 91.7362, 26.1445, 91.7362);
if (sameLoc !== 0) throw new Error(`Expected 0 km for same location, got ${sameLoc}`);

// 2. Nearby locations (Guwahati center to Dispur, ~5.3 km)
const nearbyLoc = calculateDistance(26.1445, 91.7362, 26.142, 91.789);
if (typeof nearbyLoc !== "number" || nearbyLoc < 4 || nearbyLoc > 7) {
  throw new Error(`Expected nearby distance ~5.3 km, got ${nearbyLoc}`);
}

// 3. Far locations (Guwahati to Dibrugarh, ~345 km)
const farLoc = calculateDistance(26.1445, 91.7362, 27.4728, 94.912);
if (typeof farLoc !== "number" || farLoc < 330 || farLoc > 360) {
  throw new Error(`Expected far distance ~345 km, got ${farLoc}`);
}

// 4. String inputs
const stringLoc = calculateDistance("26.1445", "91.7362", "27.4728", "94.9120");
if (stringLoc !== farLoc) throw new Error("String input failed to parse correctly");

// 5. Invalid coordinates: Null Island (0,0)
if (calculateDistance(0, 0, 26.1445, 91.7362) !== null) {
  throw new Error("Null Island (0,0) should return null");
}

// 6. Out of range coordinates
if (calculateDistance(95, 91.7362, 26.1445, 91.7362) !== null) {
  throw new Error("Lat > 90 should return null");
}
if (calculateDistance(26.1445, 190, 26.1445, 91.7362) !== null) {
  throw new Error("Lng > 180 should return null");
}

// 7. Null or undefined values
if (calculateDistance(null, 91.7362, 26.1445, 91.7362) !== null) {
  throw new Error("Null lat should return null");
}
if (calculateDistance(undefined, 91.7362, 26.1445, 91.7362) !== null) {
  throw new Error("Undefined lat should return null");
}
if (calculateDistance(26.1445, "invalid", 26.1445, 91.7362) !== null) {
  throw new Error("NaN should return null");
}

// 8. isValidCoordinate assertions
if (!isValidCoordinate(26.1445, 91.7362)) throw new Error("Valid coordinate failed");
if (isValidCoordinate(0, 0)) throw new Error("0,0 should be invalid");
if (isValidCoordinate(null, 91.7362)) throw new Error("Null should be invalid");

console.log("✅ All frontend utils unit tests passed successfully!");
