import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBranchIdToSuppliers1760000000000 implements MigrationInterface {
  name = 'AddBranchIdToSuppliers1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('suppliers', 'branchId');
    if (hasColumn) return;

    await queryRunner.addColumn(
      'suppliers',
      new TableColumn({
        name: 'branchId',
        type: 'uuid',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('suppliers', 'branchId');
    if (!hasColumn) return;
    await queryRunner.dropColumn('suppliers', 'branchId');
  }
}
