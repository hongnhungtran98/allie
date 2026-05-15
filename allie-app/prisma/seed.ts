import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    { name: "Admin",                    email: "admin@allianceitsc.com",                    password: "admin@123!",      role: Role.ADMIN },
    { name: "Nhung",                    email: "nhung.tranthihong@allianceitsc.com",        password: "123456",      role: Role.USER  },
    { name: "Âu Trường Giang",          email: "giang.autruong@allianceitsc.com",           password: "password@123", role: Role.USER },
    { name: "Đào Cẩm Thanh",            email: "thanh.daocam@allianceitsc.com",             password: "password@123", role: Role.USER },
    { name: "Lê Nam Thái Sơn",          email: "son.lenamthai@allianceitsc.com",            password: "password@123", role: Role.USER },
    { name: "Lê Ngọc Minh",             email: "minh.lengoc@allianceitsc.com",              password: "password@123", role: Role.USER },
    { name: "Lê Xuân Khanh",            email: "khanh.lexuan@allianceitsc.com",             password: "password@123", role: Role.USER },
    { name: "Ngô Minh Hưng",            email: "hung.ngominh@allianceitsc.com",             password: "password@123", role: Role.USER },
    { name: "Nguyễn Thị Bích Vân",      email: "van.nguyenthibich@allianceitsc.com",        password: "password@123", role: Role.USER },
    { name: "Nguyễn Trọng Phúc",        email: "phuc.nguyentrong@allianceitsc.com",         password: "password@123", role: Role.USER },
    { name: "Phan Hoàng Dung",          email: "dung.phanhoang@allianceitsc.com",           password: "password@123", role: Role.USER },
    { name: "Tống Nguyễn Hoàng Trung",  email: "trung.tongnguyenhoang@allianceitsc.com",    password: "password@123", role: Role.USER },
    { name: "Trần Văn Thanh",           email: "thanh.tranvan@allianceitsc.com",            password: "password@123", role: Role.USER },
    { name: "Trương Lê Hưng",           email: "htruong@allianceitsc.com",                  password: "password@123", role: Role.USER },
    { name: "Võ Thanh Phong",           email: "phong.vothanh@allianceitsc.com",            password: "password@123", role: Role.USER },
    { name: "Nguyễn Thị Ngọc Trâm",     email: "tram.nguyenngoc@allianceitsc.com",          password: "password@123", role: Role.USER },
    { name: "Bùi Minh Dũng",            email: "dung.buiminh@allianceitsc.com",             password: "password@123", role: Role.USER },
    { name: "Trương Lê Khánh",          email: "khanhtl@allianceitsc.com",                  password: "password@123", role: Role.USER },
    { name: "Cao Khắc Bảo",             email: "bao.caokhac@allianceitsc.com",              password: "password@123", role: Role.USER },
    { name: "Lê Vi",                    email: "vilee@allianceitsc.com",                    password: "password@123", role: Role.USER },
    { name: "Vũ Thu Trang",             email: "tvu@allianceitsc.com",                      password: "password@123", role: Role.USER },
    { name: "Trương Mạn Ngọc",          email: "ngoc.truongman@allianceitsc.com",           password: "password@123", role: Role.USER },
    { name: "Trang Phan Thế Hào",       email: "hao.trangphanthe@allianceitsc.com",         password: "password@123", role: Role.USER },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { role: u.role },
      create: { name: u.name, email: u.email, passwordHash, role: u.role, notificationEnabled: true },
    });
    console.log(`✓ ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
