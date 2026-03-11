const fs = require("fs");

function time12ToSeconds(time) {
    let [clock, period] = time.split(" ");
    let [h, m, s] = clock.split(":").map(Number);

    if (period.toLowerCase() === "pm" && h !== 12) h += 12;
    if (period.toLowerCase() === "am" && h === 12) h = 0;

    return h * 3600 + m * 60 + s;
}

function timeToSeconds(time) {
    let [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s;
}

function secondsToTime(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;

    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    
 let start = time12ToSeconds(startTime);
    let end = time12ToSeconds(endTime);

    let duration = end - start;

    return secondsToTime(duration);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
   
    let start = time12ToSeconds(startTime);
    let end = time12ToSeconds(endTime);

    let eightAM = time12ToSeconds("8:00:00 am");
    let tenPM = time12ToSeconds("10:00:00 pm");

    let idle = 0;

    if (start < eightAM) {
        idle += eightAM - start;
    }

    if (end > tenPM) {
        idle += end - tenPM;
    }

    return secondsToTime(idle);
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    
    let shift = timeToSeconds(shiftDuration);
    let idle = timeToSeconds(idleTime);

    let active = shift - idle;

    return secondsToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let active = timeToSeconds(activeTime);

    let d = new Date(date);
    let month = d.getMonth() + 1;
    let day = d.getDate();

    let quota;

    if (month === 4 && day >= 10 && day <= 30) {
        quota = timeToSeconds("6:00:00");
    } else {
        quota = timeToSeconds("8:24:00");
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let data = fs.readFileSync(textFile, "utf8");
    let rows = data.trim().split("\n");

    for (let row of rows) {
        let parts = row.split(",");

        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);

    let newRow = [
        shiftObj.driverID,
        shiftObj.driverName,
        shiftObj.date,
        shiftObj.startTime,
        shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        quota,
        false
    ].join(",");

    rows.push(newRow);

    fs.writeFileSync(textFile, rows.join("\n"));

    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus: false
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let rows = fs.readFileSync(textFile, "utf8").trim().split("\n");

    for (let i = 0; i < rows.length; i++) {

        let parts = rows[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue;
            rows[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile, rows.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
     function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf8");
    let rows = data.trim().split("\n");

    let count = 0;
    let driverFound = false;

    let targetMonth = parseInt(month);

    for (let row of rows) {

        if (row.trim() === "") continue;

        let parts = row.split(",");

        let id = parts[0].trim();
        let date = parts[2].trim();
        let bonus = parts[9].trim().toLowerCase();

        if (id === driverID) {

            driverFound = true;

            let rowMonth = parseInt(date.split("-")[1]);

            if (rowMonth === targetMonth && bonus === "true") {
                count++;
            }
        }
    }

    if (!driverFound) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let rows = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let total = 0;

    for (let row of rows) {

        let p = row.split(",");

        if (p[0] === driverID) {

            let m = parseInt(p[2].split("-")[1]);

            if (m === parseInt(month)) {
                total += timeToSeconds(p[7]);
            }
        }
    }

    return secondsToTime(total);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
      let shiftData = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let targetMonth = parseInt(month);
    let totalRequiredSeconds = 0;
    let dayOff = null;

    // find driver dayOff from rate file
    for (let row of rateData) {

        let parts = row.split(",");

        if (parts[0] === driverID) {
            dayOff = parts[1].trim();
            break;
        }
    }

    for (let row of shiftData) {

        if (row.trim() === "") continue;

        let parts = row.split(",");

        if (parts[0] !== driverID) continue;

        let date = parts[2];
        let d = new Date(date);

        let m = d.getMonth() + 1;

        if (m !== targetMonth) continue;

        let weekday = d.toLocaleDateString("en-US", { weekday: "long" });

        // skip driver day off
        if (weekday === dayOff) continue;

        let day = d.getDate();

        let quota;

        // Eid quota
        if (m === 4 && day >= 10 && day <= 30) {
            quota = timeToSeconds("6:00:00");
        } else {
            quota = timeToSeconds("8:24:00");
        }

        totalRequiredSeconds += quota;
    }

    // subtract bonus hours
    totalRequiredSeconds -= bonusCount * 2 * 3600;

    if (totalRequiredSeconds < 0) totalRequiredSeconds = 0;

    return secondsToTime(totalRequiredSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let row of rateData) {

        let parts = row.split(",");

        if (parts[0] === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
            break;
        }
    }

    let actualSec = timeToSeconds(actualHours);
    let requiredSec = timeToSeconds(requiredHours);

    let missingSec = requiredSec - actualSec;

    if (missingSec <= 0) {
        return basePay;
    }

    let missingHours = missingSec / 3600;

    let allowance;

    if (tier === 1) allowance = 50;
    else if (tier === 2) allowance = 20;
    else if (tier === 3) allowance = 10;
    else allowance = 3;

    let billableHours = Math.floor(missingHours - allowance);

    if (billableHours <= 0) {
        return basePay;
    }

    let deductionRate = Math.floor(basePay / 185);

    let salaryDeduction = billableHours * deductionRate;

    let netPay = basePay - salaryDeduction;

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
