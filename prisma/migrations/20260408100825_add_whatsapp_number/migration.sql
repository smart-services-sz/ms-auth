ALTER TABLE `User`
  ADD COLUMN `whatsappNumber` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `User_whatsappNumber_key` ON `User`(`whatsappNumber`);
