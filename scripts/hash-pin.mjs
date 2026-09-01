import bcrypt from "bcryptjs";
const pin = process.argv[2];
if (!pin) throw new Error("사용법: npm run hash-pin -- 1234");
console.log(await bcrypt.hash(pin, 12));

