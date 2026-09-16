const { PrismaClient, AttendanceStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const studentNames = [
  "王小明",
  "李小華",
  "陳小美",
  "張志強",
  "林佳儀",
  "黃柏豪",
  "吳欣怡",
  "劉冠廷",
  "蔡依婷",
  "楊承翰",
  "許雅婷",
  "鄭宇翔",
  "謝雨萱",
  "郭彥廷",
  "羅思妤",
  "宋子安",
  "何采潔",
  "徐品妤",
  "唐志豪",
  "周慧如",
  "高俊傑",
  "林家豪",
  "許書瑄",
  "曾冠宇",
  "彭詩涵",
  "賴奕辰",
  "丁雅雯",
  "蘇柏宇",
  "葉欣妍",
  "洪瑞廷",
  "余佩珊",
  "程冠霖",
  "鄧心瑜",
  "沈承恩",
  "蔡昀蓁",
];

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();

  const students = await prisma.$transaction(
    studentNames.map((name, index) =>
      prisma.student.create({
        data: {
          studentNumber: String(index + 1).padStart(2, "0"),
          name,
          studentId: `S2026${String(index + 1).padStart(3, "0")}`,
          active: true,
        },
      })
    )
  );

  const studentByNumber = new Map(students.map((student) => [student.studentNumber, student]));
  const today = dateOnly("2026-09-16");
  const yesterday = dateOnly("2026-09-15");

  await prisma.attendance.createMany({
    data: [
      {
        studentId: studentByNumber.get("03").id,
        date: today,
        status: AttendanceStatus.LEAVE_SICK,
        note: "感冒",
      },
      {
        studentId: studentByNumber.get("08").id,
        date: today,
        status: AttendanceStatus.LATE,
        note: "08:15 到校",
      },
      {
        studentId: studentByNumber.get("12").id,
        date: today,
        status: AttendanceStatus.LEAVE_PERSONAL,
        note: "家庭因素",
      },
      {
        studentId: studentByNumber.get("21").id,
        date: today,
        status: AttendanceStatus.ABSENT,
        note: "未到校",
      },
      {
        studentId: studentByNumber.get("15").id,
        date: today,
        status: AttendanceStatus.LEAVE_OFFICIAL,
        note: "校隊比賽",
      },
      {
        studentId: studentByNumber.get("25").id,
        date: today,
        status: AttendanceStatus.EARLY_LEAVE,
        note: "13:20 離校",
      },
      {
        studentId: studentByNumber.get("03").id,
        date: yesterday,
        status: AttendanceStatus.PRESENT,
        note: null,
      },
      {
        studentId: studentByNumber.get("08").id,
        date: yesterday,
        status: AttendanceStatus.LEAVE_PERSONAL,
        note: "家中事務",
      },
    ],
  });

  console.log(`Seeded ${students.length} students and sample attendance data.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
