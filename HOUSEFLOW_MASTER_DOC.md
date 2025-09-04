# Houseflow — Master Project Document
> Generated on: 2025-08-31T21:49:10.335Z
> Repo: houseflow @  | Commit: 

## 0. TL;DR
- What this project is: Household app (shopping lists, finances, invites)
- Tech: Next.js (Pages Router), TypeScript, Tailwind, Prisma + Postgres, NextAuth, CapRover/Docker, GitHub Actions

---

## 1. Project Overview
- Purpose & scope
- User roles & permissions
- High-level features
- Status & constraints
## 2. Architecture & Tech Stack
- Frontend/Backend/Auth/DB/Infra/CI overview
## 3. Directory Tree (pruned)
```
├── .vscode
│   └── settings.json
├── captain-definition
├── Dockerfile
├── HOUSEFLOW_MASTER_DOC.md
├── log.txt
├── next-env.d.ts
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── prisma
│   ├── migrations
│   │   │   ├── 000_init
│   │   │   │   │   │   └── migration.sql
│   │   │   ├── 20250819133233_invites_schema
│   │   │   │   │   │   └── migration.sql
│   │   │   ├── 20250822110757_add_active_household_to_user
│   │   │   │   │   │   └── migration.sql
│   │   │   ├── 20250825094835_shopping_lists_items_backrel
│   │   │   │   │   │   └── migration.sql
│   │   │   ├── 20250825132405_add_price_scraper_tables
│   │   │   │   │   │   └── migration.sql
│   │   │   ├── 20250825144731_add_category_to_price_offer
│   │   │   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   └── schema.prisma
├── public
│   ├── logo.png
│   ├── placeholder.png
│   └── smart-images
│   │       ├── 00349a54d46bc264.jpg
│   │       ├── 008b7d99519fe7a3.jpg
│   │       ├── 00c28a3e674fcc5a.jpg
│   │       ├── 0123f6d85f7595df.jpg
│   │       ├── 013383521bc37d85.jpg
│   │       ├── 013d3d70e5919e78.jpg
│   │       ├── 016ab6e9e10f4dde.jpg
│   │       ├── 0180f4bfa272b436.jpg
│   │       ├── 01cc27ea91fc6553.jpg
│   │       ├── 01cf16e7517e19e3.jpg
│   │       ├── 020eb38f74df371a.jpg
│   │       ├── 022df18003ecf81e.jpg
│   │       ├── 024a0cda93be5d3d.jpg
│   │       ├── 024a1938fa919731.jpg
│   │       ├── 02bbd820f2665b2b.jpg
│   │       ├── 02c4bb370540415a.jpg
│   │       ├── 0301377137ea8086.jpg
│   │       ├── 032a7c6e32a4251b.jpg
│   │       ├── 0366d0fce42a5f1a.jpg
│   │       ├── 036f208908c4dead.jpg
│   │       ├── 037d17e1cf837007.jpg
│   │       ├── 03f1b6f3efc90098.jpg
│   │       ├── 0433c4ef480c579e.jpg
│   │       ├── 04480f1561826038.jpg
│   │       ├── 0452e13af3a22f92.jpg
│   │       ├── 045eb1ace2736012.jpg
│   │       ├── 046f944e479b56ea.jpg
│   │       ├── 04cab4514c438447.jpg
│   │       ├── 0515bdf548b3ac7d.jpg
│   │       ├── 0516efb5773fce1d.jpg
│   │       ├── 059f4f3a9828b6e5.jpg
│   │       ├── 0600a3e1242b31cc.jpg
│   │       ├── 0611ece4aab4502a.jpg
│   │       ├── 0619256a6423f7b5.jpg
│   │       ├── 0627cb5fff80434f.jpg
│   │       ├── 0628f8fc1564453d.jpg
│   │       ├── 064274ef47e44931.jpg
│   │       ├── 065237319052a0dc.jpg
│   │       ├── 0676971749cb1047.jpg
│   │       ├── 0685ec53a8ec8a73.jpg
│   │       ├── 0687b76091116861.jpg
│   │       ├── 06a6e75bd8e5a828.jpg
│   │       ├── 06a8d73f5d75173d.jpg
│   │       ├── 06e40ab9b3fd9f30.jpg
│   │       ├── 06e8db37c0751c68.jpg
│   │       ├── 06f2dee14cd9cc0b.jpg
│   │       ├── 076add3276537684.jpg
│   │       ├── 079c12a1f699f1bd.jpg
│   │       ├── 07a2e4b3a3b1b291.jpg
│   │       ├── 07afb3051bc0838f.jpg
│   │       ├── 07dff67e7004e428.jpg
│   │       ├── 081a26deb3ba89f2.jpg
│   │       ├── 08981c723a6fac29.jpg
│   │       ├── 08c0f44b1145b7e6.jpg
│   │       ├── 0915b7e3e4e0d281.jpg
│   │       ├── 096a283eb302cf34.jpg
│   │       ├── 09a3e4b7c595f52d.jpg
│   │       ├── 09d345a769defa7f.jpg
│   │       ├── 0a1d8a11b3ad6d18.jpg
│   │       ├── 0a21ae8be0810fd2.jpg
│   │       ├── 0a2ea28351ab603a.jpg
│   │       ├── 0a5ba522ebacea2c.jpg
│   │       ├── 0a6ba8a9b3febb62.jpg
│   │       ├── 0aed3f855e7600f8.jpg
│   │       ├── 0af8f4c025bfda9b.jpg
│   │       ├── 0b3c80fef93bbf12.jpg
│   │       ├── 0b6ba944e713d535.jpg
│   │       ├── 0b7907e932728211.jpg
│   │       ├── 0b818e5b9addb1df.jpg
│   │       ├── 0ba68188b3e6eea1.jpg
│   │       ├── 0be780060ec625bd.jpg
│   │       ├── 0c6287434dc62d75.jpg
│   │       ├── 0c9ddc8a50a19155.jpg
│   │       ├── 0cc4c1b48a679729.jpg
│   │       ├── 0cf794b65e875344.jpg
│   │       ├── 0cff489f32953915.jpg
│   │       ├── 0d3a0b9e8036855e.jpg
│   │       ├── 0d3e0d63cc20685b.jpg
│   │       ├── 0d448b613dd5f76e.jpg
│   │       ├── 0d721f909ec296f3.jpg
│   │       ├── 0d760a02fd730335.jpg
│   │       ├── 0d9a42e0f41bb2cb.jpg
│   │       ├── 0da70995bffc8310.jpg
│   │       ├── 0dbdadf80f681ca7.jpg
│   │       ├── 0dc08c4a44e217bc.jpg
│   │       ├── 0de50a0432e4dc9f.jpg
│   │       ├── 0e0d4413b94673f5.jpg
│   │       ├── 0e1ddd0dcb4d4f6c.jpg
│   │       ├── 0e1e270544944e41.jpg
│   │       ├── 0e2bf30c2f0d8ac2.jpg
│   │       ├── 0e3fb3cab90fc14f.jpg
│   │       ├── 0e45b8279c1c2f60.jpg
│   │       ├── 0e5e901b30c6cab8.jpg
│   │       ├── 0e61d6deb570b0ff.jpg
│   │       ├── 0e62535f84e11683.jpg
│   │       ├── 0e85a33cab761b3d.jpg
│   │       ├── 0e8cec07fb3ce607.jpg
│   │       ├── 0f143283605860f0.jpg
│   │       ├── 0f148ca94a981989.jpg
│   │       ├── 0f520801bab0b455.jpg
│   │       ├── 0fb56a94dfe746ab.jpg
│   │       ├── 0fd9c0c0634831af.jpg
│   │       ├── 101c5f43af371cba.jpg
│   │       ├── 1030c264589f8681.jpg
│   │       ├── 1033a871bd0c2f63.jpg
│   │       ├── 1051d49f6c844184.jpg
│   │       ├── 1059c9c96dbbbbbd.jpg
│   │       ├── 10847be75218c30f.jpg
│   │       ├── 1088fbe00a93d129.jpg
│   │       ├── 10ec50f85888d291.jpg
│   │       ├── 11076008638b2858.jpg
│   │       ├── 110b31ece18fd636.jpg
│   │       ├── 11266e2be660f43d.jpg
│   │       ├── 1150959deca4b2e1.jpg
│   │       ├── 1150ca44988174c8.jpg
│   │       ├── 1150ef0d73c123d5.jpg
│   │       ├── 1157b03d31715f01.jpg
│   │       ├── 115918984a91d167.jpg
│   │       ├── 1191ab7230e9d754.jpg
│   │       ├── 124073c2ca9faefa.jpg
│   │       ├── 124fe5c6b2c4bab7.jpg
│   │       ├── 1264d088c36dcaa6.jpg
│   │       ├── 1294f3b0b0a71bb9.jpg
│   │       ├── 12b486cd13e984a5.jpg
│   │       ├── 12cb352b882d3925.jpg
│   │       ├── 12e912ef09c73dfe.jpg
│   │       ├── 1315248f64b88903.jpg
│   │       ├── 1357e97632defbc4.jpg
│   │       ├── 1441e643b91d60d4.jpg
│   │       ├── 14af096ad8f7fad5.jpg
│   │       ├── 14c89108a019bf32.jpg
│   │       ├── 14c9d4cfe57152d6.jpg
│   │       ├── 14df09c1d049ce75.jpg
│   │       ├── 15676f72a47accec.jpg
│   │       ├── 1589639d90c91b2f.jpg
│   │       ├── 15fac7a8368d2299.jpg
│   │       ├── 161c7dc6e18758fd.jpg
│   │       ├── 16328ef3010163c3.jpg
│   │       ├── 1634834316424b09.jpg
│   │       ├── 1646f3a4c5ba977a.jpg
│   │       ├── 16665eaa39c7a361.jpg
│   │       ├── 167b8c5ad6467ec5.jpg
│   │       ├── 1682161c1741f793.jpg
│   │       ├── 169baa74c57a0344.jpg
│   │       ├── 1718a2a7d5ad6c73.jpg
│   │       ├── 17514a5dc30bdf1e.jpg
│   │       ├── 176d49195f904b89.jpg
│   │       ├── 1790eb4c7034f47d.jpg
│   │       ├── 18e904d90703ab07.jpg
│   │       ├── 1924a9e39e5ad2f7.jpg
│   │       ├── 1958d62fd471ad77.jpg
│   │       ├── 1965a4538d51f931.jpg
│   │       ├── 19fffbfcf7c14dac.jpg
│   │       ├── 1a07ac90762fbfdb.jpg
│   │       ├── 1a0e6cd1f150e9c3.jpg
│   │       ├── 1a47da01a48a9f40.jpg
│   │       ├── 1a69ea549b23053f.jpg
│   │       ├── 1af75391dbc2f7ae.jpg
│   │       ├── 1b07662a4fe7ad1c.jpg
│   │       ├── 1b3ad282fab1ee61.jpg
│   │       ├── 1b4c5fbdbabf5b81.jpg
│   │       ├── 1b565d9d2f1f013c.jpg
│   │       ├── 1b86275add2cec97.jpg
│   │       ├── 1b93b95fc1a65804.jpg
│   │       ├── 1bd4e6ac4b96e31c.jpg
│   │       ├── 1c060a07cd20a2f6.jpg
│   │       ├── 1c1e3ada27190b39.jpg
│   │       ├── 1c6bb7efcf524757.jpg
│   │       ├── 1c84d30b68f4a894.jpg
│   │       ├── 1cad1bd17a901bef.jpg
│   │       ├── 1caec1d9610c8a18.jpg
│   │       ├── 1cb9a09d48d238e0.jpg
│   │       ├── 1cc8f90550851ac2.jpg
│   │       ├── 1ccf3decf421a2e5.jpg
│   │       ├── 1ce60c58566e981c.jpg
│   │       ├── 1cf2d1ca5deab743.jpg
│   │       ├── 1cf7fa745e17f189.jpg
│   │       ├── 1d16f16d5ec9d7b8.jpg
│   │       ├── 1d7c32bfcb6bc8c9.jpg
│   │       ├── 1d915a6d9c9f1bc7.jpg
│   │       ├── 1dc0b0ed05e01c81.jpg
│   │       ├── 1dce4c8042de03b8.jpg
│   │       ├── 1dd1cec9626d8754.jpg
│   │       ├── 1deb7a3d779875a4.jpg
│   │       ├── 1dff59ac1342143b.jpg
│   │       ├── 1e0635fc6baa269e.jpg
│   │       ├── 1e2fb8b9a06e1c93.jpg
│   │       ├── 1e601ddcf5d66e0f.jpg
│   │       ├── 1e61934e4d388d94.jpg
│   │       ├── 1e99d5938ad7ce82.jpg
│   │       ├── 1eb2d56a1bcc6105.jpg
│   │       ├── 1eb922a75b8be18f.jpg
│   │       ├── 1ef973fe49c6052a.jpg
│   │       ├── 1eff39a9ce162662.jpg
│   │       ├── 1f191853da5f76db.jpg
│   │       ├── 1f3a86b053ce3409.jpg
│   │       ├── 1f5575d20ce774f1.jpg
│   │       ├── 1f8cd6a6491b5237.jpg
│   │       ├── 1f980b60371f9ea6.jpg
│   │       ├── 1fbb24604651b25f.jpg
│   │       ├── 1fbda644e4aabf0d.jpg
│   │       ├── 200a5645edee7ef7.jpg
│   │       ├── 200d44a217b9f417.jpg
│   │       ├── 203793cd8a2845a9.jpg
│   │       ├── 2050acef1cafb1e9.jpg
│   │       ├── 20817fc289a99c9e.jpg
│   │       ├── 208bd22b211d60df.jpg
│   │       ├── 209dcb20ca553bcf.jpg
│   │       ├── 20a9e3e3bb7a8034.jpg
│   │       ├── 20c4f168592df5bc.jpg
│   │       ├── 20cd806d5cd854e6.jpg
│   │       ├── 20d58b28a695204c.jpg
│   │       ├── 20edc868bd3fdf62.jpg
│   │       ├── 20f813c9a248f682.jpg
│   │       ├── 2128411c4ee923d3.jpg
│   │       ├── 219b77cd444012ec.jpg
│   │       ├── 21c1326730afd5dd.jpg
│   │       ├── 22084431cb059b88.jpg
│   │       ├── 221a63f4f864ad49.jpg
│   │       ├── 227ff41196fb3581.jpg
│   │       ├── 22bcdfb671460621.jpg
│   │       ├── 22f35642ec4b77a8.jpg
│   │       ├── 22f669752ec77696.jpg
│   │       ├── 22ff9ecc4d58a095.jpg
│   │       ├── 2325acf830cdf932.jpg
│   │       ├── 232c59ac308e557e.jpg
│   │       ├── 237a747a01a2f45d.jpg
│   │       ├── 23a220abc06b4db2.jpg
│   │       ├── 23a99b316f26f175.jpg
│   │       ├── 244dd9ee8f6e56b8.jpg
│   │       ├── 24a1e53f63b8755c.jpg
│   │       ├── 24ae098368d637cc.jpg
│   │       ├── 24d4a96d54d3633f.jpg
│   │       ├── 24e9795231a9e5c8.jpg
│   │       ├── 253772a9be92c449.jpg
│   │       ├── 256937e38d6db744.jpg
│   │       ├── 258516f295144024.jpg
│   │       ├── 25c4ac35df517154.jpg
│   │       ├── 25ce63273c266ec1.jpg
│   │       ├── 25f3abef2866da46.jpg
│   │       ├── 25f647871210fbf4.jpg
│   │       ├── 264bac7fdaba63b6.jpg
│   │       ├── 264ee22be5bdac64.jpg
│   │       ├── 266860a5391bb1b3.jpg
│   │       ├── 2673b373ad6e4137.jpg
│   │       ├── 2675762eb79382d2.jpg
│   │       ├── 268bdcc6ca66a801.jpg
│   │       ├── 26c855ab195e07b6.jpg
│   │       ├── 271e70ebda19e7c5.jpg
│   │       ├── 2748eaf3dfca1182.jpg
│   │       ├── 2765cae6e4f4bdac.jpg
│   │       ├── 279026986812699c.jpg
│   │       ├── 27db20d865950d14.jpg
│   │       ├── 27fe073b103b8758.jpg
│   │       ├── 280ed83c6bc48748.jpg
│   │       ├── 2834f727f07e98be.jpg
│   │       ├── 28694a53cd94915e.jpg
│   │       ├── 28e2e46deba8e555.jpg
│   │       ├── 28e50158fa0c6812.jpg
│   │       ├── 293494ae03da5634.jpg
│   │       ├── 2949463a4a8edf35.jpg
│   │       ├── 29699046e26ed613.jpg
│   │       ├── 2984bd89ae1e1d4f.jpg
│   │       ├── 2a0dff6297a9ccd4.jpg
│   │       ├── 2a5284bde574ac05.jpg
│   │       ├── 2a953077c62b6673.jpg
│   │       ├── 2acb5858d2d4606f.jpg
│   │       ├── 2af125e065bfb2dd.jpg
│   │       ├── 2af700bb56926639.jpg
│   │       ├── 2b226e910d0c163d.jpg
│   │       ├── 2b35170d444d13dc.jpg
│   │       ├── 2b466ec9715694e0.jpg
│   │       ├── 2b6f6e9b45e02099.jpg
│   │       ├── 2bd4af1a0a7ea7c0.jpg
│   │       ├── 2c28b29b191d9524.jpg
│   │       ├── 2c81576510d1d8a2.jpg
│   │       ├── 2c881407eb063c5c.jpg
│   │       ├── 2ca9e9a2c179af41.jpg
│   │       ├── 2d140699600934b4.jpg
│   │       ├── 2d1cb5377d93765b.jpg
│   │       ├── 2d782af30b3c3810.jpg
│   │       ├── 2d8592fe4e7f6dc8.jpg
│   │       ├── 2d88945af212dfaa.jpg
│   │       ├── 2d8f613f6bc35284.jpg
│   │       ├── 2dc7973fd2782f3a.jpg
│   │       ├── 2e0bb05ab8499d13.jpg
│   │       ├── 2e453f93d8520ce5.jpg
│   │       ├── 2e553cc68f941834.jpg
│   │       ├── 2e9a1ecc7539d4eb.jpg
│   │       ├── 2ea9b250308464da.jpg
│   │       ├── 2eab5ae0dca7c312.jpg
│   │       ├── 2eee2759ecadb813.jpg
│   │       ├── 2f3f74b29e6ca3ce.jpg
│   │       ├── 2f537f633aa2210b.jpg
│   │       ├── 2fd754000ea9ff33.jpg
│   │       ├── 307806fbb962e3f7.jpg
│   │       ├── 30c56fe0c6aabc99.jpg
│   │       ├── 30e4e6f38a0f07cc.jpg
│   │       ├── 30eec2669e4c71a1.jpg
│   │       ├── 30f2cbc8bb6811ce.jpg
│   │       ├── 31075c09ce196185.jpg
│   │       ├── 31b5f6bb114a3813.jpg
│   │       ├── 31c457d031bd3a2b.jpg
│   │       ├── 31e38d6e0bf0021f.jpg
│   │       ├── 31f19640b8e42d97.jpg
│   │       ├── 3221644d0121be13.jpg
│   │       ├── 325472601571f31e.axd
│   │       ├── 32564d2eb7156061.jpg
│   │       ├── 32694e2050514277.jpg
│   │       ├── 32792b0e4f8fcd83.jpg
│   │       ├── 32a6b37b028120f5.jpg
│   │       ├── 32af465814717f47.jpg
│   │       ├── 332e2a1d7620f336.jpg
│   │       ├── 333a1c7f5baeb0da.jpg
│   │       ├── 3376e4985c839a22.jpg
│   │       ├── 33a923683d6e485e.jpg
│   │       ├── 33f7d4cd409683e8.jpg
│   │       ├── 344fa66677f96713.jpg
│   │       ├── 3477aea0e4414047.jpg
│   │       ├── 34827e38adf20b22.jpg
│   │       ├── 349b5a3e6d8873e4.jpg
│   │       ├── 34d7eaf86924ee5f.jpg
│   │       ├── 34e603f8617ad2ec.jpg
│   │       ├── 3530c45b3f00df24.jpg
│   │       ├── 3565b865f2698d50.jpg
│   │       ├── 3574159d16cb0146.jpg
│   │       ├── 35a7f1fe8eee03a8.jpg
│   │       ├── 35cb0ec99776e1f5.jpg
│   │       ├── 35e7775f76967104.jpg
│   │       ├── 35f3cbc40e238264.jpg
│   │       ├── 3617c36cec7574d7.jpg
│   │       ├── 362fba6a3bacb825.jpg
│   │       ├── 36486fe0cd9df0a1.jpg
│   │       ├── 3659e97844bd5203.jpg
│   │       ├── 365d3799f5e08919.jpg
│   │       ├── 367b91ac7d20314b.jpg
│   │       ├── 371bd4554e119949.jpg
│   │       ├── 37651a05376abb48.jpg
│   │       ├── 376a732c05c64ed2.jpg
│   │       ├── 37dd26f2e98454d1.jpg
│   │       ├── 3805e684972d4998.jpg
│   │       ├── 381b0cf8020b3a67.jpg
│   │       ├── 385f69ea2a2f06f3.jpg
│   │       ├── 38a1a966c456ee85.jpg
│   │       ├── 38b590336e42fcc8.jpg
│   │       ├── 3913c85c04c885f2.jpg
│   │       ├── 39283b79e9ea6f51.jpg
│   │       ├── 39764f344d5ad45d.jpg
│   │       ├── 39bea75d6afb2ee1.jpg
│   │       ├── 39c1a9fcc3b346fc.jpg
│   │       ├── 39ed36def3008a20.jpg
│   │       ├── 3a01de2c2da1592c.jpg
│   │       ├── 3a14e92b7782b644.jpg
│   │       ├── 3a6963cf74f2638c.jpg
│   │       ├── 3a7daab054ea6d2a.jpg
│   │       ├── 3ab3c3151452c94e.jpg
│   │       ├── 3ad157a9ad901d66.jpg
│   │       ├── 3b01547aac966477.jpg
│   │       ├── 3b13aed9a3802b1b.jpg
│   │       ├── 3b32be7ebe619783.jpg
│   │       ├── 3b33a46b06b61b68.jpg
│   │       ├── 3bab1aae68564e16.jpg
│   │       ├── 3bd2fb612eac9697.jpg
│   │       ├── 3c04b1f0de48523a.jpg
│   │       ├── 3c2dd6aae6a67c31.jpg
│   │       ├── 3c40c8fa3906dba4.jpg
│   │       ├── 3c6a64b8c2750693.jpg
│   │       ├── 3c7c69db760e5fe3.jpg
│   │       ├── 3cd61924a00c9a4b.jpg
│   │       ├── 3d0a1b20b370d7ab.jpg
│   │       ├── 3d19c946fd41a62c.jpg
│   │       ├── 3d6b1bf0096187cc.jpg
│   │       ├── 3d74684de2654abd.jpg
│   │       ├── 3d76b9e459370ce6.jpg
│   │       ├── 3d9b8d103d7451b1.jpg
│   │       ├── 3dbe7dc5f34f45b6.jpg
│   │       ├── 3e28ea1100c2a8a9.jpg
│   │       ├── 3e6bb3f4e47a843e.jpg
│   │       ├── 3e758650fae8b28e.jpg
│   │       ├── 3e82a3dde95ac1b7.jpg
│   │       ├── 3ec25a92e01a6c79.jpg
│   │       ├── 3edf3e7179ebcd76.jpg
│   │       ├── 3ee27d1104516af3.jpg
│   │       ├── 3f5de5342e07c1f4.jpg
│   │       ├── 3f861dc2c86892db.jpg
│   │       ├── 3fe5ce7755afd85b.jpg
│   │       ├── 40099f9a0f9c9080.jpg
│   │       ├── 400b4ac8a37a35df.jpg
│   │       ├── 401cad1063c1a35a.jpg
│   │       ├── 405f9b01c6b92673.jpg
│   │       ├── 4102586dc6c1c3b5.jpg
│   │       ├── 4167ab1f3473b24f.jpg
│   │       ├── 41680d903898138b.jpg
│   │       ├── 4183bb58f3191cfd.jpg
│   │       ├── 41c7d7d736282d54.jpg
│   │       ├── 41ed24441c80f0f2.jpg
│   │       ├── 41f0ac3d9856d8ae.jpg
│   │       ├── 422127d0c37c32e1.jpg
│   │       ├── 422806fe9f5dedcd.jpg
│   │       ├── 426c5af7970da781.jpg
│   │       ├── 42cbb26c82b14f31.jpg
│   │       ├── 43171fed38bb77c8.jpg
│   │       ├── 43402bdbf958a422.jpg
│   │       ├── 434d630e99f04e9e.jpg
│   │       ├── 439c692da0949cbf.jpg
│   │       ├── 4427985e9f676941.jpg
│   │       ├── 447d430eb95d32cd.jpg
│   │       ├── 448c9bdd602bdd24.jpg
│   │       ├── 44af61d5377b3666.jpg
│   │       ├── 44bb25238c12b7d5.jpg
│   │       ├── 4517875af29062a5.jpg
│   │       ├── 4522e718eb467b23.jpg
│   │       ├── 45247764038e983c.jpg
│   │       ├── 452cfddb5a0c0e78.jpg
│   │       ├── 4530d29fe06cc007.jpg
│   │       ├── 4531d690be78f5c7.jpg
│   │       ├── 453c1fcb5bc71ed0.jpg
│   │       ├── 455e30b345359837.jpg
│   │       ├── 4565a2e2bedb4389.jpg
│   │       ├── 456bee27eaf961e5.jpg
│   │       ├── 45a69c9a877cf281.jpg
│   │       ├── 463560e45aa2a1de.jpg
│   │       ├── 465d4d35538cda7a.jpg
│   │       ├── 467e6450272d8bd0.jpg
│   │       ├── 468e4ea73ce8f015.jpg
│   │       ├── 46cf6946a09c205d.jpg
│   │       ├── 46dd5b4bbf74b0b5.jpg
│   │       ├── 4710e0cb8f0ed398.jpg
│   │       ├── 471a6971661d6196.jpg
│   │       ├── 472362d3b85b84bc.jpg
│   │       ├── 4736828dab145348.jpg
│   │       ├── 474eff5df95a207b.jpg
│   │       ├── 476bba2492aab958.jpg
│   │       ├── 477809946e8d3bc9.jpg
│   │       ├── 4789dda3e0478e40.jpg
│   │       ├── 47dbe7c99e3c01e9.jpg
│   │       ├── 47ef4836f8a82ac5.jpg
│   │       ├── 47f8ac93326fec9d.jpg
│   │       ├── 481a75f11ea71cdb.jpg
│   │       ├── 48654e57949f8b34.jpg
│   │       ├── 4888bb2cf17edd74.jpg
│   │       ├── 48ecd5ec7f21556d.jpg
│   │       ├── 4957d9c7ca04dc35.jpg
│   │       ├── 49665880a9da326d.jpg
│   │       ├── 49799440b40e1d9e.jpg
│   │       ├── 49ae4920a0cdca1e.jpg
│   │       ├── 49b137a35f5530a0.jpg
│   │       ├── 49b84aa7befa9723.jpg
│   │       ├── 49bc308746c62007.jpg
│   │       ├── 4a08d0478b59e198.jpg
│   │       ├── 4a2a6f50a0122a91.jpg
│   │       ├── 4a2c333e5e730d8f.jpg
│   │       ├── 4a8a7492a193e15c.jpg
│   │       ├── 4ad155e7df89e3f4.jpg
│   │       ├── 4ae74985e77da396.jpg
│   │       ├── 4b0d329e8028ae4f.jpg
│   │       ├── 4b12ed7e2fb1b71f.jpg
│   │       ├── 4b1c753380ec3550.jpg
│   │       ├── 4b2dc46d34681982.jpg
│   │       ├── 4b2e726e6f63d12b.jpg
│   │       ├── 4b7da27c351fd49d.jpg
│   │       ├── 4bb2fbf0ecd47348.jpg
│   │       ├── 4bc2f7f934b68ef7.jpg
│   │       ├── 4bdae2a15754e68f.jpg
│   │       ├── 4c48f948fb0d7b24.jpg
│   │       ├── 4cbbe9512041ebe3.jpg
│   │       ├── 4cbc8f8b42c13f82.jpg
│   │       ├── 4cc7a22e20a13bd0.jpg
│   │       ├── 4cd177c0f8e2d869.jpg
│   │       ├── 4d0344dc88e8ccb2.jpg
│   │       ├── 4d4f7a6604d908ef.jpg
│   │       ├── 4dd80044b119eea9.jpg
│   │       ├── 4de90202c5ab71f1.jpg
│   │       ├── 4e122477c8e1388a.jpg
│   │       ├── 4e3edacb34658a66.jpg
│   │       ├── 4e50e7d3c62f94ed.jpg
│   │       ├── 4ea37aba0299ad6f.jpg
│   │       ├── 4ee18f33cb18ea8b.jpg
│   │       ├── 4f111ed0a9048726.jpg
│   │       ├── 4f44644cc61fb270.jpg
│   │       ├── 4f5e8ebe79ecf6b9.jpg
│   │       ├── 4f6bbd9bbb919231.jpg
│   │       ├── 4fab29d022b20649.jpg
│   │       ├── 4faf38b94db199a2.jpg
│   │       ├── 4fb2824c4a604c5b.jpg
│   │       ├── 4fd19dd7aba929c5.jpg
│   │       ├── 4ffcbce6e349503c.jpg
│   │       ├── 502726d891c5e43e.jpg
│   │       ├── 5055327e41a6f0ce.jpg
│   │       ├── 5087ca6388e78cb1.jpg
│   │       ├── 50b2a559f9e3e5a6.jpg
│   │       ├── 50e72808c7559da3.jpg
│   │       ├── 513aba8aa8422aa2.jpg
│   │       ├── 519b590d3d8be2f5.jpg
│   │       ├── 51c76fe80f8238a5.jpg
│   │       ├── 51e22748af4b8003.jpg
│   │       ├── 520dc9358ba8440f.jpg
│   │       ├── 520fa8f39baf58c7.jpg
│   │       ├── 525f72aff75074cf.jpg
│   │       ├── 5295c0f51fd82c9d.jpg
│   │       ├── 529f395f56f6b646.jpg
│   │       ├── 52a778153a699209.jpg
│   │       ├── 52ae92156a3a2b9a.jpg
│   │       ├── 52cc72cab483738e.jpg
│   │       ├── 5319c6773436e44e.jpg
│   │       ├── 532f1c72b7bcdbb1.jpg
│   │       ├── 5332c60e1431816c.jpg
│   │       ├── 5334aac297282c72.jpg
│   │       ├── 5353c0adf5c2601e.jpg
│   │       ├── 535683d05f24a378.jpg
│   │       ├── 539787919d88fe3e.jpg
│   │       ├── 5408176ff345ec93.jpg
│   │       ├── 5408b710c29ca740.jpg
│   │       ├── 5486bf8b9c595855.jpg
│   │       ├── 54c3789b51956c6b.jpg
│   │       ├── 5518453cfdefae28.jpg
│   │       ├── 55794dabd0421d5d.jpg
│   │       ├── 5589ccdf618bb027.jpg
│   │       ├── 558b4f7d0c84612e.jpg
│   │       ├── 558bb090b67c190e.jpg
│   │       ├── 55a71a50327659e6.jpg
│   │       ├── 55d2f4393d1e4aa8.jpg
│   │       ├── 55f43e812cd6dbdd.jpg
│   │       ├── 5613c066dd023b16.jpg
│   │       ├── 567fc827a6140ce8.jpg
│   │       ├── 56893e912228a4dc.jpg
│   │       ├── 56a5569e90376433.jpg
│   │       ├── 56f199c183143c38.jpg
│   │       ├── 571308350f8f5092.jpg
│   │       ├── 573f1974b5d50982.jpg
│   │       ├── 57448d748c2f266c.jpg
│   │       ├── 5756cc68cd530f13.jpg
│   │       ├── 57a5436aa43af467.jpg
│   │       ├── 57c089dd32638c69.jpg
│   │       ├── 580ea28cadf2bd90.jpg
│   │       ├── 5864d88125e09c5e.jpg
│   │       ├── 58fa5fd4c8a456e0.jpg
│   │       ├── 592542084f6b0842.jpg
│   │       ├── 5952d0344f032dc5.jpg
│   │       ├── 59793d0e9f9fe889.jpg
│   │       ├── 5989fed057133a44.jpg
│   │       ├── 5999e24dfa331429.jpg
│   │       ├── 59cabcf5e37c7a67.jpg
│   │       ├── 59f6027e312afe7e.jpg
│   │       ├── 5a2012decf01de70.jpg
│   │       ├── 5a2c90609a9e7b55.jpg
│   │       ├── 5ac165b5c6429ea1.jpg
│   │       ├── 5ac30d83aec149b5.jpg
│   │       ├── 5b2d2dc0e63d92d5.jpg
│   │       ├── 5b39ccc61dd3a37e.jpg
│   │       ├── 5b57768258425a25.jpg
│   │       ├── 5b58802ea6e5b1e7.jpg
│   │       ├── 5b7efef853e9fbbf.jpg
│   │       ├── 5b9636dfdafb0889.jpg
│   │       ├── 5ba0cfc49ab8f66b.jpg
│   │       ├── 5ba7a13b1aced0ed.jpg
│   │       ├── 5bcc9706d216668c.jpg
│   │       ├── 5bf367bfe3698687.jpg
│   │       ├── 5c0c5f6d147041d5.jpg
│   │       ├── 5c726623abacb391.jpg
│   │       ├── 5c86d32077684128.jpg
│   │       ├── 5cd1437d021c689e.jpg
│   │       ├── 5cfbdf27a4e9eb7a.jpg
│   │       ├── 5d1db47daac8a675.jpg
│   │       ├── 5d31b315aae1db39.jpg
│   │       ├── 5d3e0c8c459593ae.jpg
│   │       ├── 5d4f17adb9577708.jpg
│   │       ├── 5dc2c651aa151a68.jpg
│   │       ├── 5de751a116516aff.jpg
│   │       ├── 5df214e1ff92f60f.jpg
│   │       ├── 5dff50e5b7d24b9d.jpg
│   │       ├── 5e15c65e618009f1.jpg
│   │       ├── 5e91efdb384daeaa.jpg
│   │       ├── 5e97e1ffd33de362.jpg
│   │       ├── 5ea4c9706efac53c.jpg
│   │       ├── 5ec23693df9a7f00.jpg
│   │       ├── 5f258a581870c3d1.jpg
│   │       ├── 5f5473765012bf94.jpg
│   │       ├── 5f61b5f8dd098ec4.jpg
│   │       ├── 5f6373f1647f26d4.jpg
│   │       ├── 5f6a3b534cebb2bf.jpg
│   │       ├── 5f6a59ca35ab02f2.jpg
│   │       ├── 5f84614046b1402a.jpg
│   │       ├── 5fcff050ea9e1e47.jpg
│   │       ├── 5fde25c81a1b72c6.jpg
│   │       ├── 60c04785330a17da.jpg
│   │       ├── 6115f8ab2290b90d.jpg
│   │       ├── 6123990c387edd65.jpg
│   │       ├── 6148e776a38723ce.jpg
│   │       ├── 6174e8a61a8455c1.jpg
│   │       ├── 61a771a19f7ad0c4.jpg
│   │       ├── 61a8c7523237c9e8.jpg
│   │       ├── 624c921c381022c3.jpg
│   │       ├── 6288f0c01038dcfb.jpg
│   │       ├── 6298e1401f8319d4.jpg
│   │       ├── 62af93c5928716ca.jpg
│   │       ├── 62c3c246e2840e42.jpg
│   │       ├── 62ccf74ecda2685b.jpg
│   │       ├── 62ea0276849469fe.jpg
│   │       ├── 62f779a12d131122.jpg
│   │       ├── 63402561704193de.jpg
│   │       ├── 6354120519823a39.jpg
│   │       ├── 638e8e8333159aac.jpg
│   │       ├── 63af1df3f4fd3ad1.jpg
│   │       ├── 642ff0cea27fe2c9.jpg
│   │       ├── 649bbdc52305c809.jpg
│   │       ├── 651fc333672a3657.jpg
│   │       ├── 6561095db0ad94be.jpg
│   │       ├── 6573968aaa23d0bf.jpg
│   │       ├── 65a0186774e38855.jpg
│   │       ├── 65a7f29eb285f77a.jpg
│   │       ├── 65c3a2440fed51cc.jpg
│   │       ├── 65d0268c1f76176f.jpg
│   │       ├── 65e0d7783a9e1e4d.jpg
│   │       ├── 65f89d2ef70b88c2.jpg
│   │       ├── 661c2fbcfb4978bb.jpg
│   │       ├── 662331350d2d5946.jpg
│   │       ├── 66466705516091d6.jpg
│   │       ├── 664e5587b854e5de.jpg
│   │       ├── 665f45206a065846.jpg
│   │       ├── 668c7301c231f9b9.jpg
│   │       ├── 66b69ad1bdf4832f.jpg
│   │       ├── 66b8e6e3674923aa.jpg
│   │       ├── 66fcf0bfdd301fad.jpg
│   │       ├── 677574668f529be7.jpg
│   │       ├── 67828e641b1f70c1.jpg
│   │       ├── 67daaa5f1a2403de.jpg
│   │       ├── 68aeb194b375dbce.jpg
│   │       ├── 68b7a500b87afd06.jpg
│   │       ├── 68bb4212d3fe3095.jpg
│   │       ├── 68c4c49a97f48a1a.jpg
│   │       ├── 68ca3ca1192cfd35.jpg
│   │       ├── 6935cfaee63a1d2f.jpg
│   │       ├── 6943bc9d22b10d70.jpg
│   │       ├── 69492128bf0fca17.jpg
│   │       ├── 69b4987e3067709f.jpg
│   │       ├── 69c1950cde847864.jpg
│   │       ├── 69d2b810052caedf.jpg
│   │       ├── 6a061c974d35aee5.jpg
│   │       ├── 6a59ba1e9851b32b.jpg
│   │       ├── 6a7e5c9c5262f427.jpg
│   │       ├── 6aac843a27ab63a2.jpg
│   │       ├── 6ad453c280c3e0eb.jpg
│   │       ├── 6b52b7a52b6a89df.jpg
│   │       ├── 6b565011cdae83aa.jpg
│   │       ├── 6b6ba8bab0c2a34f.jpg
│   │       ├── 6ba8267ef9a23198.jpg
│   │       ├── 6baab8e46272f791.jpg
│   │       ├── 6bbb6d5101aabea9.jpg
│   │       ├── 6bcf70fe740c6038.axd
│   │       ├── 6c2795fe84a9ca72.jpg
│   │       ├── 6c36458546d61318.jpg
│   │       ├── 6c45617d161a94af.jpg
│   │       ├── 6c99307254c70ec5.jpg
│   │       ├── 6caa5b1ac3571ed4.jpg
│   │       ├── 6d13529d366753da.jpg
│   │       ├── 6d5d2adcf789c68c.jpg
│   │       ├── 6e14c2651d96a248.jpg
│   │       ├── 6e5e4773466f7287.jpg
│   │       ├── 6efd05fa854a2554.jpg
│   │       ├── 6f283c75931166c3.jpg
│   │       ├── 6f56f055b059fd12.jpg
│   │       ├── 6f5b3aab72aeaa80.jpg
│   │       ├── 6fa9b88113442cf8.jpg
│   │       ├── 6faad995a89fcdfd.jpg
│   │       ├── 6fdeccdb52290263.jpg
│   │       ├── 709646e9bf94c221.jpg
│   │       ├── 70eb959b6df9a3e8.jpg
│   │       ├── 710b32b7a6541951.jpg
│   │       ├── 712a11c3f25aeec0.jpg
│   │       ├── 714048735775b6ba.jpg
│   │       ├── 71412c5639a8f32e.jpg
│   │       ├── 715f2f50ff1e9943.jpg
│   │       ├── 720bc5cdf738e40e.jpg
│   │       ├── 7237f44d87f671f5.jpg
│   │       ├── 7247d43b4908cfb1.jpg
│   │       ├── 724eda8184f4e2cf.jpg
│   │       ├── 72741c9bf66d2c2a.jpg
│   │       ├── 7301b57ab5d3c40f.jpg
│   │       ├── 73030e06e8bf7168.jpg
│   │       ├── 731e022d7338daa2.jpg
│   │       ├── 73ba7b145d849582.jpg
│   │       ├── 73ca36c0e01b068a.jpg
│   │       ├── 73d57046c3ed2df7.jpg
│   │       ├── 743b9ad8ff93cf4b.jpg
│   │       ├── 746827273c816ffa.axd
│   │       ├── 74b1aef7a6665ffc.jpg
│   │       ├── 74f25802b7e62b28.jpg
│   │       ├── 752bc691bf467b5c.jpg
│   │       ├── 753505a5c60609ea.jpg
│   │       ├── 75fe539b7156f9d7.jpg
│   │       ├── 760335a79bdee172.jpg
│   │       ├── 7652ed93bd96bb2a.jpg
│   │       ├── 7688d1ab5823fc45.jpg
│   │       ├── 76b13501e2e5d092.jpg
│   │       ├── 76d9bc662f3bb8f2.jpg
│   │       ├── 76f64dd3ae0bf1d3.jpg
│   │       ├── 773835e16b0af3cd.jpg
│   │       ├── 77d0e692e37d8752.jpg
│   │       ├── 77fd6617f839d2ae.jpg
│   │       ├── 7805ff27871afb10.jpg
│   │       ├── 782600d9d5ea8a05.jpg
│   │       ├── 783bb2a405e52aea.jpg
│   │       ├── 7884e84aeb11156c.jpg
│   │       ├── 78cbf739d41b2ee2.jpg
│   │       ├── 78da8b44ef7dba0b.jpg
│   │       ├── 78e76dd804c0ca2d.jpg
│   │       ├── 78e7e8de57c68e04.jpg
│   │       ├── 78f6883645a2e674.jpg
│   │       ├── 798761ab14ae2ec5.jpg
│   │       ├── 79903628b956d4dd.jpg
│   │       ├── 79a61471b3dadbd8.jpg
│   │       ├── 79a951868a2aca48.jpg
│   │       ├── 79ae364205d959cb.jpg
│   │       ├── 7ae75ae3cf2ba5bf.jpg
│   │       ├── 7b2241688200b46b.jpg
│   │       ├── 7b2314c63ba29578.jpg
│   │       ├── 7b5745c93e340b92.jpg
│   │       ├── 7bb9b2df71732a37.jpg
│   │       ├── 7bfedaae5dfd21c4.jpg
│   │       ├── 7c2790a25e2323fd.jpg
│   │       ├── 7c4ea1112821f8b6.jpg
│   │       ├── 7cc3b407e461892e.jpg
│   │       ├── 7cc74da7c766475a.jpg
│   │       ├── 7cf2f2a3cdb78190.jpg
│   │       ├── 7d1c05aa5127a4cd.jpg
│   │       ├── 7d5dc4c196293b1e.jpg
│   │       ├── 7d85ddc773125227.jpg
│   │       ├── 7dad0f571290d328.jpg
│   │       ├── 7e5de1c298fd06f5.jpg
│   │       ├── 7e91c16b47746e33.jpg
│   │       ├── 7eb1b6ed5f012bc0.jpg
│   │       ├── 7ed7270c90b7a0a8.jpg
│   │       ├── 7ef2ae204e5cda08.jpg
│   │       ├── 7f2698cd74dd27e1.jpg
│   │       ├── 7f75a16238a3ba98.jpg
│   │       ├── 7fc135b9a83d4d3f.jpg
│   │       ├── 7ff087bf08e7fc8f.jpg
│   │       ├── 801d34854a3580f3.jpg
│   │       ├── 803d06520ac8f317.jpg
│   │       ├── 803f69034ce2fc1a.jpg
│   │       ├── 8073915f17165083.jpg
│   │       ├── 80a8dc582e0c421a.jpg
│   │       ├── 80c5332732972edc.jpg
│   │       ├── 80e1e94da94e9bf3.jpg
│   │       ├── 80ed1e794352b6f8.jpg
│   │       ├── 8108e817d78aba25.jpg
│   │       ├── 8165a8d2ec419272.jpg
│   │       ├── 8166464091cc310f.jpg
│   │       ├── 816f8c02f07f3629.jpg
│   │       ├── 81d04ca9bd3e35e7.jpg
│   │       ├── 81ea2c6bb686c2fa.jpg
│   │       ├── 81eac072aa9a7923.jpg
│   │       ├── 81fd44fc7d946901.jpg
│   │       ├── 825ec6cd4d77e444.jpg
│   │       ├── 8269d0887e1be97f.jpg
│   │       ├── 82977341c83814dd.jpg
│   │       ├── 82e1110c04c3d043.jpg
│   │       ├── 833f24c2d525f03e.jpg
│   │       ├── 839862acb1dd87ec.jpg
│   │       ├── 83b0a345bccc532f.jpg
│   │       ├── 83bde99f3ec66d6b.jpg
│   │       ├── 83f24861bc161bf3.jpg
│   │       ├── 8405706ae40aaa5c.jpg
│   │       ├── 840b24f283b96d52.jpg
│   │       ├── 8430caef050718e2.jpg
│   │       ├── 847c9691419db535.jpg
│   │       ├── 84a8a3513478ff79.jpg
│   │       ├── 851d89cde2d20c71.jpg
│   │       ├── 857c786f14e99863.jpg
│   │       ├── 85bc14b1ccb0d0fd.jpg
│   │       ├── 85c1bf5c6ba8caff.jpg
│   │       ├── 85f2710606d98ae9.jpg
│   │       ├── 861e0db4ebbd942b.jpg
│   │       ├── 86206a7a14db608a.jpg
│   │       ├── 862070a5cb6e1bca.jpg
│   │       ├── 8685658222ce2770.jpg
│   │       ├── 86c28337b53b4bca.jpg
│   │       ├── 86d1a803f8ee0d5f.jpg
│   │       ├── 86d2af7dd7b52011.jpg
│   │       ├── 86f35f025dbc4938.jpg
│   │       ├── 870e96accf7bff72.jpg
│   │       ├── 8761d40b9f96d540.jpg
│   │       ├── 878db338d6d672fc.jpg
│   │       ├── 879dbd8c21304d5a.jpg
│   │       ├── 87ead1a0d8468f14.jpg
│   │       ├── 88205e2ecd27ad35.jpg
│   │       ├── 8853d73535d2ef2e.jpg
│   │       ├── 8873208c5d3a7fbc.jpg
│   │       ├── 88751dc30d53c4d9.jpg
│   │       ├── 88c170b247dee1f5.jpg
│   │       ├── 88ccff94eeb881ed.jpg
│   │       ├── 88d51cdd76f74264.jpg
│   │       ├── 88db7a82c28061c3.jpg
│   │       ├── 890bf5eb6b9e8ceb.jpg
│   │       ├── 891944e623bdcb5a.jpg
│   │       ├── 891baea4e437f810.jpg
│   │       ├── 895c00168cab36f1.jpg
│   │       ├── 895d75e74c99e105.jpg
│   │       ├── 8967d571a6bdde30.jpg
│   │       ├── 8985d9307ae4c63f.jpg
│   │       ├── 89b83720f0cc44d6.jpg
│   │       ├── 89d79f4ac0ece7b6.jpg
│   │       ├── 89f8dff123048108.jpg
│   │       ├── 8a214f559faa5dde.jpg
│   │       ├── 8a372bd667bb4353.jpg
│   │       ├── 8a797d3d431bb066.jpg
│   │       ├── 8aeb39c1f1c0190b.jpg
│   │       ├── 8b23c34fec5c1ba0.jpg
│   │       ├── 8b257491b1ab279c.jpg
│   │       ├── 8b29327faa93223d.jpg
│   │       ├── 8b922acfca6ae407.jpg
│   │       ├── 8bcf7ebea10b0251.jpg
│   │       ├── 8bd04348ad72e06d.jpg
│   │       ├── 8bf294bfd5655649.jpg
│   │       ├── 8c37db64b76fdd97.jpg
│   │       ├── 8cd29f4cbce18313.jpg
│   │       ├── 8ce377ff021e3950.jpg
│   │       ├── 8cedecd8d4102944.jpg
│   │       ├── 8cfe600655908854.jpg
│   │       ├── 8d0f5f7c8726e965.jpg
│   │       ├── 8d46686eccf2ad45.jpg
│   │       ├── 8d509a6b42c65caa.jpg
│   │       ├── 8d650d78d2d19cc3.jpg
│   │       ├── 8d7cbb9b773ad0f9.jpg
│   │       ├── 8d830cc3fbc0b8bf.jpg
│   │       ├── 8dec6aa52363e3c3.jpg
│   │       ├── 8dfdab7b2de4e5e6.jpg
│   │       ├── 8e43123d7745b478.jpg
│   │       ├── 8e456272aa925f5a.jpg
│   │       ├── 8e90ac4a6f7402be.jpg
│   │       ├── 8e9705f9331425f4.jpg
│   │       ├── 8eb4eac90b2aa932.jpg
│   │       ├── 8ec3c83906e8ec91.jpg
│   │       ├── 8edeb3c1be1b4cc7.jpg
│   │       ├── 8f1960536aaa387b.jpg
│   │       ├── 8f1a29cd0fe81f0c.jpg
│   │       ├── 8f227bbf0ad2894c.jpg
│   │       ├── 8f3cdd9da2396d88.jpg
│   │       ├── 8f88c6bfa770a405.jpg
│   │       ├── 8febde24138e5559.jpg
│   │       ├── 90b9ed10110edf39.jpg
│   │       ├── 90ca38ac09ff8d2f.jpg
│   │       ├── 911ffe21b189ed7d.jpg
│   │       ├── 91784dc6bdb20112.jpg
│   │       ├── 9178c904d0836861.jpg
│   │       ├── 9194f489c946d759.jpg
│   │       ├── 91a1be8ae18819d7.jpg
│   │       ├── 91a254470a8a8d52.jpg
│   │       ├── 91a686c583d17bef.jpg
│   │       ├── 91b2877f6ed83b44.jpg
│   │       ├── 920ca34e7ae4bc17.jpg
│   │       ├── 922c64eca5188ccd.jpg
│   │       ├── 9235a2bcedcc645d.jpg
│   │       ├── 924de3b8fb2ab2be.jpg
│   │       ├── 928649eb0b6f5517.jpg
│   │       ├── 9286e9fa84aef6d1.jpg
│   │       ├── 92e379e181fbd9f7.jpg
│   │       ├── 9308b8ba8267a784.jpg
│   │       ├── 932c28d34a6b284a.jpg
│   │       ├── 937bf7482c4706b5.jpg
│   │       ├── 9380236dab0f7cdc.jpg
│   │       ├── 93b77657ace5bf61.jpg
│   │       ├── 93c599e8f6663267.jpg
│   │       ├── 9415c95eb35e5caa.jpg
│   │       ├── 9486e8980de38ada.jpg
│   │       ├── 956140b68a9c74ec.jpg
│   │       ├── 9604528b64cf5c4c.jpg
│   │       ├── 9613eafe4bddd500.jpg
│   │       ├── 96636192d5725dc1.jpg
│   │       ├── 969bdce9b3484b09.jpg
│   │       ├── 96c099cc4f5b48a9.jpg
│   │       ├── 96f4664cbfe21864.jpg
│   │       ├── 9706428e4301bbad.jpg
│   │       ├── 97087095e0e93d91.jpg
│   │       ├── 971cf6cb7a5a517f.jpg
│   │       ├── 972143d1f2df411a.jpg
│   │       ├── 9725f246572a0cfe.jpg
│   │       ├── 979cd86d202e9d73.jpg
│   │       ├── 979fbd2b20f62b2d.jpg
│   │       ├── 97bc11809d3c13b3.jpg
│   │       ├── 97d4583132596913.jpg
│   │       ├── 97f5c37a6540d777.jpg
│   │       ├── 97fbbd3cee08593d.jpg
│   │       ├── 9803871442aade0f.jpg
│   │       ├── 980f6a8a2599794a.jpg
│   │       ├── 987d1293881ea7a2.jpg
│   │       ├── 9897464f8330949e.jpg
│   │       ├── 98ea18ffdd4aa678.jpg
│   │       ├── 98f347d6e0df2625.jpg
│   │       ├── 9900b5be15cd3988.jpg
│   │       ├── 990f86df31e06021.jpg
│   │       ├── 997f0f7850bb3942.jpg
│   │       ├── 99930fff6a9a790a.jpg
│   │       ├── 99aac150b9cb3630.jpg
│   │       ├── 99c6092563de60ea.jpg
│   │       ├── 99d300a0ae8abd58.jpg
│   │       ├── 99eccbf966391185.jpg
│   │       ├── 9a2db99ab0a79c8f.jpg
│   │       ├── 9a74501963238459.jpg
│   │       ├── 9a7b81673fa37a77.jpg
│   │       ├── 9a8bb014383f7634.jpg
│   │       ├── 9a91550891a62419.jpg
│   │       ├── 9b1019657407ea83.jpg
│   │       ├── 9b245730edc87681.jpg
│   │       ├── 9c2d5d115e4cc8fe.jpg
│   │       ├── 9c5c70ad26f68349.jpg
│   │       ├── 9c5ec82a8e563108.jpg
│   │       ├── 9c8e2fb9af9ccaeb.jpg
│   │       ├── 9ca5a4bfd3c3e8c8.jpg
│   │       ├── 9cb989c6b9c5e995.jpg
│   │       ├── 9cd4c963a7970963.jpg
│   │       ├── 9ce66f4e685797a4.jpg
│   │       ├── 9ceecd9c233c98a9.jpg
│   │       ├── 9d5508497be6157b.jpg
│   │       ├── 9d7a594ca0e08830.jpg
│   │       ├── 9d9d0c4515ac6d69.jpg
│   │       ├── 9da3f5f7130c17b0.jpg
│   │       ├── 9dba0e0aa9bbf071.jpg
│   │       ├── 9dcc68bfb471873d.jpg
│   │       ├── 9dd04420993c5fd9.jpg
│   │       ├── 9de1e776eef24cec.jpg
│   │       ├── 9dea36cbbe6af81c.jpg
│   │       ├── 9e24ae6fbb9b1389.jpg
│   │       ├── 9e2656ba9814299a.jpg
│   │       ├── 9e36cf5850ea4026.jpg
│   │       ├── 9e56e457fb2e6c80.jpg
│   │       ├── 9e5c64dd633a33d4.jpg
│   │       ├── 9e659266a5909f37.jpg
│   │       ├── 9e813e87f2428578.jpg
│   │       ├── 9e89a74e6ba426ef.jpg
│   │       ├── 9e948857110ce8e9.jpg
│   │       ├── 9ed40d7c70e3cb4e.jpg
│   │       ├── 9eef818ffa59bf1f.jpg
│   │       ├── 9ef962e95bd06762.jpg
│   │       ├── 9f0483d18d26b0cc.jpg
│   │       ├── 9f0d1438177f721d.jpg
│   │       ├── 9f627c172f9caaef.jpg
│   │       ├── a040f52764545f72.jpg
│   │       ├── a069d5cb899901e1.jpg
│   │       ├── a0728f8ae914f522.jpg
│   │       ├── a0bce453833ed2e6.jpg
│   │       ├── a0c0a093ea090de4.jpg
│   │       ├── a0f7316ac5a6873d.jpg
│   │       ├── a12439194510a863.jpg
│   │       ├── a12484fbde71c803.jpg
│   │       ├── a126ca4ebd788798.jpg
│   │       ├── a13fe6f10cf1626f.jpg
│   │       ├── a1a25921985c4631.jpg
│   │       ├── a1ff1da3e765bddb.jpg
│   │       ├── a214cb18dd56119e.jpg
│   │       ├── a26d7e8ee012a200.jpg
│   │       ├── a2c081da6d1494e9.jpg
│   │       ├── a2c93168494defcb.jpg
│   │       ├── a2eda7537a1e272f.jpg
│   │       ├── a2f00988e8fb3f54.jpg
│   │       ├── a316e42c57ba4f5c.jpg
│   │       ├── a3453c7543efd3bc.jpg
│   │       ├── a345886cc219e3b0.jpg
│   │       ├── a38193feeea6ff1e.jpg
│   │       ├── a38764dd649132a9.jpg
│   │       ├── a38cfa52c5aa4101.jpg
│   │       ├── a3d554e94c39c3da.jpg
│   │       ├── a3fa7db39103b074.jpg
│   │       ├── a43cbfd209e96d39.jpg
│   │       ├── a45e80d187869c1b.jpg
│   │       ├── a470455865e00104.jpg
│   │       ├── a49e47eb31661378.jpg
│   │       ├── a4f0a5a637907384.jpg
│   │       ├── a4f247cc4919e61b.jpg
│   │       ├── a554dadae0ffd9d7.jpg
│   │       ├── a5716b2c0d9ca5c1.jpg
│   │       ├── a57284b2678ca812.jpg
│   │       ├── a5f93b1269a0bc95.jpg
│   │       ├── a5fcd2aa3956bb6c.jpg
│   │       ├── a633538add318e2c.jpg
│   │       ├── a66f3529cca8cff5.jpg
│   │       ├── a67eaacbb9891d5f.jpg
│   │       ├── a6c467aa3ed074fb.jpg
│   │       ├── a6dddb2484d24e49.jpg
│   │       ├── a724fd9e1d1238c6.jpg
│   │       ├── a740000c86a569b2.jpg
│   │       ├── a79349576502dc1b.jpg
│   │       ├── a8748429462778a2.jpg
│   │       ├── a88632f02058ffe4.jpg
│   │       ├── a8cfde340e635b6b.jpg
│   │       ├── a8d44c54a8e5af1e.jpg
│   │       ├── a90a5796e0acfda4.jpg
│   │       ├── a90afc953b48c34e.jpg
│   │       ├── a915cbd12d02092b.jpg
│   │       ├── a9ba4de468224f47.jpg
│   │       ├── aa40618245ea46b8.jpg
│   │       ├── aac6c17db6378d05.jpg
│   │       ├── ab252fc5f97e02be.jpg
│   │       ├── ab29d1022a3c1e47.jpg
│   │       ├── ab67953101b6b071.jpg
│   │       ├── aba797b51adfc227.jpg
│   │       ├── abd413a7d718a503.jpg
│   │       ├── ac75e420d6b7600c.jpg
│   │       ├── acb930e07868b2b1.jpg
│   │       ├── ad84e91c063ba430.jpg
│   │       ├── ad97ab1ba3597e75.jpg
│   │       ├── adcaa0159492bb13.jpg
│   │       ├── ae47fab3f98896ff.jpg
│   │       ├── ae66c017382294e3.jpg
│   │       ├── ae804019ba5b4737.jpg
│   │       ├── ae983387d12f0e19.jpg
│   │       ├── aed0a7be8e351aa9.jpg
│   │       ├── aed9e8fcd23a3f15.jpg
│   │       ├── af20b91d5c43bb72.jpg
│   │       ├── af361aaf60b0ea37.jpg
│   │       ├── af733477ede38e3e.jpg
│   │       ├── af9abbd91239c9b6.jpg
│   │       ├── b013fe3961136672.jpg
│   │       ├── b067a0305f9b2a52.aspx
│   │       ├── b0c4f37902678dea.jpg
│   │       ├── b0e34926ac44c345.jpg
│   │       ├── b1384b0a32d31b67.jpg
│   │       ├── b158063296d719c9.jpg
│   │       ├── b1bacb0891f290c5.jpg
│   │       ├── b1edeb21fec6d8f0.jpg
│   │       ├── b20f5b9a75352b57.jpg
│   │       ├── b23ff4b31189c0ac.jpg
│   │       ├── b2beebe239eb3793.jpg
│   │       ├── b2d7bb113f7c9ace.jpg
│   │       ├── b2ec7e33b8bd0766.jpg
│   │       ├── b3172c8fea30b30f.jpg
│   │       ├── b34153f54a144d67.jpg
│   │       ├── b36f67920f1cca88.jpg
│   │       ├── b3997a0a39c16dac.jpg
│   │       ├── b39bc1684201e4c7.jpg
│   │       ├── b3c25a87f5633a39.jpg
│   │       ├── b41f7989a7484f96.jpg
│   │       ├── b46f7cc30bda29eb.jpg
│   │       ├── b49c157f34d4b42c.jpg
│   │       ├── b4def3378c363435.jpg
│   │       ├── b54ad4568b117b95.jpg
│   │       ├── b55e4cdde87d2c91.jpg
│   │       ├── b56d13ce1e4be4ad.jpg
│   │       ├── b56f641d54725b26.jpg
│   │       ├── b5acd365a91c834a.jpg
│   │       ├── b624ac0d93a0aff7.jpg
│   │       ├── b65bb96c09471fc0.jpg
│   │       ├── b6a6136de82ef298.jpg
│   │       ├── b6d01a2520d89719.jpg
│   │       ├── b6de2aaf58ada107.jpg
│   │       ├── b6e10f15324a1692.jpg
│   │       ├── b709bb6276b0539c.jpg
│   │       ├── b713c641d90641d9.jpg
│   │       ├── b72c7a262a3a849e.jpg
│   │       ├── b72e5aa3b8335eef.jpg
│   │       ├── b76413a33b926874.jpg
│   │       ├── b7691b840db1b531.jpg
│   │       ├── b77372e0e0d8a5c5.jpg
│   │       ├── b7753f9e7a22ed01.jpg
│   │       ├── b79790e99b576d33.jpg
│   │       ├── b7c905b1abdfab66.jpg
│   │       ├── b7dcd11d0db922ae.jpg
│   │       ├── b80182f95b042d89.jpg
│   │       ├── b84841ef08da7497.jpg
│   │       ├── b8492264202172be.jpg
│   │       ├── b85bf2cc49da7326.jpg
│   │       ├── b860a11e79b1f67c.jpg
│   │       ├── b862a854b11b0da5.jpg
│   │       ├── b89a18d8e5013d82.jpg
│   │       ├── b8acc9d3cca95791.jpg
│   │       ├── b8c30edad9369bd8.jpg
│   │       ├── b8d6b0ee3bd31355.jpg
│   │       ├── b91039528a6be396.jpg
│   │       ├── b919a606a06c9afa.jpg
│   │       ├── b9d76196a85f2ec5.jpg
│   │       ├── b9dc3494785c683c.jpg
│   │       ├── ba117eb997e17cac.jpg
│   │       ├── ba24a050bf70f57d.jpg
│   │       ├── ba286ad9ad43f346.jpg
│   │       ├── ba6cd0951a6f3ec1.jpg
│   │       ├── ba7c0e30686efd3f.jpg
│   │       ├── bab9f19dee508a0a.jpg
│   │       ├── baf32bc63452b5b3.jpg
│   │       ├── bb130a53ce4a86ff.jpg
│   │       ├── bb35656203dbb622.jpg
│   │       ├── bb5a7ba53d90ae97.jpg
│   │       ├── bb8b22685523d43c.jpg
│   │       ├── bbafdcceba206886.jpg
│   │       ├── bc4df2cf0bbffde2.jpg
│   │       ├── bc769c047dd1aeda.jpg
│   │       ├── bcb8ad24308f2473.jpg
│   │       ├── bd1873153a10ec3f.jpg
│   │       ├── bd2084fa248569a0.jpg
│   │       ├── bd551ad2020d744c.jpg
│   │       ├── bd6b85a6f389b98c.jpg
│   │       ├── bd7592ad308275ae.jpg
│   │       ├── bd8b6fd7a03603a5.jpg
│   │       ├── bda6ac5989272366.jpg
│   │       ├── bdead7a96c5fdbf0.jpg
│   │       ├── be0fbf23a4c70ac6.jpg
│   │       ├── be11cc4561d1e437.jpg
│   │       ├── be3e19835a508ffa.jpg
│   │       ├── be63a7685e1412e7.jpg
│   │       ├── be9559761d535582.jpg
│   │       ├── bf0488c872ae1603.jpg
│   │       ├── bf06f41685e15324.jpg
│   │       ├── bf3ab2b9513d9425.jpg
│   │       ├── bf8e45503851c983.jpg
│   │       ├── bfe111017d17a166.jpg
│   │       ├── c00eb283d96d4186.jpg
│   │       ├── c02cd9b5146552dc.jpg
│   │       ├── c0481b7523a4f9d8.jpg
│   │       ├── c053e7e0936e8dd8.jpg
│   │       ├── c06d17650d65ff9d.jpg
│   │       ├── c0a757dcae8c0df1.jpg
│   │       ├── c0ce793d2a76b53c.jpg
│   │       ├── c1440a82d9c0aae5.jpg
│   │       ├── c149acb5930ea72d.jpg
│   │       ├── c17f89a94ef47f85.jpg
│   │       ├── c1e0521370409c98.jpg
│   │       ├── c1ff93954a7750b1.jpg
│   │       ├── c210d5f06ca7af65.jpg
│   │       ├── c262032cbe02cb24.jpg
│   │       ├── c26c55ddf4bd6641.jpg
│   │       ├── c26e21aab20c2dbc.jpg
│   │       ├── c28613aa00023e02.jpg
│   │       ├── c2c1469dd2692c5b.jpg
│   │       ├── c2d6b622be52619c.jpg
│   │       ├── c2ec80748c809d3e.jpg
│   │       ├── c354b284f322f22f.jpg
│   │       ├── c3a89e66d603a84f.jpg
│   │       ├── c3cf1cbcd73684e0.jpg
│   │       ├── c40f8b4f67ce427e.jpg
│   │       ├── c431b64d3f4edce8.jpg
│   │       ├── c43d34365292687d.jpg
│   │       ├── c444dbe38036d164.jpg
│   │       ├── c44601abb37f2c38.jpg
│   │       ├── c4ac7a5d2aec3574.jpg
│   │       ├── c4c9282f6e26b109.jpg
│   │       ├── c522065cde494ebb.jpg
│   │       ├── c58275d698fc213d.jpg
│   │       ├── c5fd421d4ff059a5.jpg
│   │       ├── c6122ed611ee2dcf.jpg
│   │       ├── c61eb56d8c21dafb.jpg
│   │       ├── c6214a6fef887c22.jpg
│   │       ├── c62614bfb06d7eb7.jpg
│   │       ├── c6338411043daf2c.jpg
│   │       ├── c6347fdcd809357d.jpg
│   │       ├── c67bf7c16f1e808d.jpg
│   │       ├── c6fed3fb8c690d7c.jpg
│   │       ├── c720c0d83e9a5a53.jpg
│   │       ├── c7e70cc374755152.jpg
│   │       ├── c7ef39cb7ac8f204.jpg
│   │       ├── c85716ad0eb24d0c.jpg
│   │       ├── c871154e784bde39.jpg
│   │       ├── c89173bf052be517.jpg
│   │       ├── c8adf6e6e24f35bc.jpg
│   │       ├── c8d1715447010576.jpg
│   │       ├── c8f44198656896b5.jpg
│   │       ├── c993ee227dc05390.jpg
│   │       ├── c99e86b601aff659.jpg
│   │       ├── c9e70aa5502cf586.jpg
│   │       ├── c9fa81442957f571.jpg
│   │       ├── c9fd5febd4c52beb.jpg
│   │       ├── ca2050bbbe95bd86.jpg
│   │       ├── ca27e8241d40a1e9.jpg
│   │       ├── ca38a1cb139b1062.jpg
│   │       ├── ca71e759e9d79bdd.jpg
│   │       ├── ca75f91f4af4f4c3.jpg
│   │       ├── caa88d810f4a038b.jpg
│   │       ├── cab4f176b4add8dc.jpg
│   │       ├── caec709ef8cf1c6a.jpg
│   │       ├── cb801199481682c4.jpg
│   │       ├── cbabfbedcaf3fe64.jpg
│   │       ├── cbaf76b65b15dea2.jpg
│   │       ├── cc64e66b6f94eddb.jpg
│   │       ├── cc804a00d2254148.jpg
│   │       ├── cc904912a5bdf281.jpg
│   │       ├── cc99cd10cf579e44.jpg
│   │       ├── ccb13a766ef85c0e.jpg
│   │       ├── ccdc4de171e994d1.jpg
│   │       ├── cce141dcaf282f75.jpg
│   │       ├── cced42c5de1a377b.jpg
│   │       ├── cd34b825b6819801.jpg
│   │       ├── cd57a73e5930353d.jpg
│   │       ├── cd57de0f8c40cf99.jpg
│   │       ├── cd9373286fad6b45.jpg
│   │       ├── cd9604addc52b60b.jpg
│   │       ├── cda419258dd2ebd9.jpg
│   │       ├── cda71a5def1367ad.jpg
│   │       ├── cdac78726dd2722e.jpg
│   │       ├── cdbccddb3c5415d6.jpg
│   │       ├── cde5ff77c02b99b1.jpg
│   │       ├── ce484081b26016f2.jpg
│   │       ├── ce667a2df0ef226f.jpg
│   │       ├── ce705b404b4a6bf4.jpg
│   │       ├── ce710f68f02068d4.jpg
│   │       ├── cf3fec669455ee18.jpg
│   │       ├── cfc335084770236a.jpg
│   │       ├── cfff2cf29d9538e1.jpg
│   │       ├── d052db120ba86035.jpg
│   │       ├── d05a93d64ca59970.jpg
│   │       ├── d081268a89c49291.jpg
│   │       ├── d0c91840642616c9.jpg
│   │       ├── d0ca870ef6a6bc86.jpg
│   │       ├── d0da58bfd3e84b7b.jpg
│   │       ├── d10d28bc9df35a1e.jpg
│   │       ├── d134cff4a9aa63f5.jpg
│   │       ├── d14c626ee61d4de5.jpg
│   │       ├── d157ccbcf0909a9b.jpg
│   │       ├── d16cefdfb0c10e78.jpg
│   │       ├── d17fba4aa0100aba.jpg
│   │       ├── d1a32814b9ae0a06.jpg
│   │       ├── d1b2c81130edfaf4.jpg
│   │       ├── d21029b5e383b63b.jpg
│   │       ├── d2169b5f76fdd70a.jpg
│   │       ├── d225bdc63d427494.jpg
│   │       ├── d2355b31dafff54f.jpg
│   │       ├── d249b8425572ff16.jpg
│   │       ├── d257a3fbb0615e57.jpg
│   │       ├── d287f4d5bdeed086.jpg
│   │       ├── d2b72e0cafffe284.jpg
│   │       ├── d35ad4198dc3070b.jpg
│   │       ├── d39cae8ff9d4272d.jpg
│   │       ├── d3b4a9971b2fe4ab.jpg
│   │       ├── d3bf52d37fa29876.jpg
│   │       ├── d3f10d62566f26cd.jpg
│   │       ├── d468d80e4e98aba9.jpg
│   │       ├── d46a7f37e7b4ba03.jpg
│   │       ├── d46c21d0172954d5.jpg
│   │       ├── d46d4985a402b43a.jpg
│   │       ├── d4f04df4994ab9c6.jpg
│   │       ├── d501c0c3f133f629.jpg
│   │       ├── d54231696cda34fc.jpg
│   │       ├── d54719804b703cba.jpg
│   │       ├── d55cebb1f4b2246f.jpg
│   │       ├── d5d273bc0843b186.jpg
│   │       ├── d5ec6abf537807aa.jpg
│   │       ├── d5fe2aef6a237626.jpg
│   │       ├── d5febf6299c9b6e9.jpg
│   │       ├── d632009effdb74a0.jpg
│   │       ├── d6381e1650ae3432.jpg
│   │       ├── d68f252834b95cb5.jpg
│   │       ├── d6a02fb63d4bb323.jpg
│   │       ├── d73fa37d074671ab.jpg
│   │       ├── d751fe6611ce7158.jpg
│   │       ├── d763c0455811d143.jpg
│   │       ├── d76d7578fc730541.jpg
│   │       ├── d781ff2d53693444.jpg
│   │       ├── d7a230c817a5814b.jpg
│   │       ├── d7b8e00f814577e5.jpg
│   │       ├── d7ddc937650b84b2.jpg
│   │       ├── d8223ce53b376ba8.jpg
│   │       ├── d8227ce9f78b2879.jpg
│   │       ├── d89dcdafe8a92738.jpg
│   │       ├── d8b50553d80c8fcc.jpg
│   │       ├── d92ca2e681627403.jpg
│   │       ├── d92f23524e20d419.jpg
│   │       ├── d9a21df8254562a1.jpg
│   │       ├── d9f6368d046c59c6.jpg
│   │       ├── da30560478d27d42.jpg
│   │       ├── da7d9b8fdaa1ea93.jpg
│   │       ├── da80dc410eac62cf.jpg
│   │       ├── db2e393ca6926adc.jpg
│   │       ├── db45db9e475bc24b.jpg
│   │       ├── db9f0524447369db.jpg
│   │       ├── dbd0092103ce7dd0.jpg
│   │       ├── dc10e8f6838dc4a7.jpg
│   │       ├── dc172bcc4bb8a677.jpg
│   │       ├── dc5059eb2e6dc628.jpg
│   │       ├── dc992393b9b3d4bb.jpg
│   │       ├── dcc2a41834112ac3.jpg
│   │       ├── dcf877bac22d7904.jpg
│   │       ├── dd4ad8081e7777c2.jpg
│   │       ├── dd670ec9879cb6a5.jpg
│   │       ├── dd6f2e435c498bea.jpg
│   │       ├── ddb3fae7b4b3f184.jpg
│   │       ├── ddb60000a78e5f0b.jpg
│   │       ├── ddf1ecfcc54f87ba.jpg
│   │       ├── ddf29f7d9eab82db.jpg
│   │       ├── ddf2f738a5365df8.jpg
│   │       ├── ddf7d2e27373ae93.jpg
│   │       ├── de11df3d9914565c.jpg
│   │       ├── de418d6b756e727b.jpg
│   │       ├── de421ee1b329d552.jpg
│   │       ├── de6c8d99b1972704.jpg
│   │       ├── de85e215bb04db8f.jpg
│   │       ├── ded6f013bb851d1d.jpg
│   │       ├── df14e4bdee5bf4c6.jpg
│   │       ├── df3cef101e6582c4.jpg
│   │       ├── df3d6864006c5337.jpg
│   │       ├── df40fc0c54f94c05.jpg
│   │       ├── df5a6032d1210e04.jpg
│   │       ├── df734f2004b8d6ca.jpg
│   │       ├── df9293dddc387132.jpg
│   │       ├── dfb1c9f8ed14c477.jpg
│   │       ├── e0847985c8f21ca4.jpg
│   │       ├── e0ab8c8d386c0909.jpg
│   │       ├── e0fdf589fdc6131a.jpg
│   │       ├── e1715ba0093a4967.jpg
│   │       ├── e183e7a4ec5f25f6.jpg
│   │       ├── e1c10f53078e85d8.jpg
│   │       ├── e1c9dcc383cb7fb3.jpg
│   │       ├── e2529576a8dce221.jpg
│   │       ├── e29fdab91d853d58.jpg
│   │       ├── e2b1c41becb6af46.jpg
│   │       ├── e33d03ae6700c026.jpg
│   │       ├── e33ec3342138c58e.jpg
│   │       ├── e36b3c31c26395a5.jpg
│   │       ├── e3a54a34c96974ff.jpg
│   │       ├── e3ace47e06f08d54.jpg
│   │       ├── e3ec4848710fcacc.jpg
│   │       ├── e436004022006fec.jpg
│   │       ├── e460f0225a461484.jpg
│   │       ├── e4da2ff32c1a51d6.jpg
│   │       ├── e518a739cf9d178c.jpg
│   │       ├── e557df119b34d7d0.jpg
│   │       ├── e57e784f01b1fda5.jpg
│   │       ├── e5b511e15f2e3144.jpg
│   │       ├── e5be90367d79b66e.jpg
│   │       ├── e5c2350f8fcae528.jpg
│   │       ├── e5ff7f6a2e74de4b.jpg
│   │       ├── e61741aff2ac982f.jpg
│   │       ├── e62c19a31dd135d5.jpg
│   │       ├── e645526f7df965e0.jpg
│   │       ├── e6d8c1e0af83d6ed.jpg
│   │       ├── e6ee76ca429b5e7a.jpg
│   │       ├── e6f1929b360b88d3.jpg
│   │       ├── e755311001776e82.jpg
│   │       ├── e76836cf6bdae557.jpg
│   │       ├── e76a619930b94032.jpg
│   │       ├── e77a8f2b99c436a6.jpg
│   │       ├── e7b795f0d94284ca.jpg
│   │       ├── e7beddbf5a5ba9dc.jpg
│   │       ├── e7f4d56d41a5da97.jpg
│   │       ├── e872357c731a9057.jpg
│   │       ├── e8e18aae38f407e3.jpg
│   │       ├── e8e5950c76f385fd.jpg
│   │       ├── e94716e1203c4254.jpg
│   │       ├── e9613b4ace150263.jpg
│   │       ├── e992533c9b919f4d.jpg
│   │       ├── e9d3fd4811810338.jpg
│   │       ├── e9dbf7be3fa4913b.jpg
│   │       ├── ea1af20caa92621c.jpg
│   │       ├── ea2ec896c0263ad3.jpg
│   │       ├── ea36de59e34e869e.jpg
│   │       ├── ea5e53cae5496090.jpg
│   │       ├── eab73c872927b664.jpg
│   │       ├── eaecb317fd795796.jpg
│   │       ├── eafcb5822a414498.jpg
│   │       ├── eb5935ae8f404be7.jpg
│   │       ├── eb75bb6caf7a0157.jpg
│   │       ├── eb7807bfdb1201ab.jpg
│   │       ├── eb8016b2a1d51a1d.jpg
│   │       ├── eba8e8a97baa03e4.jpg
│   │       ├── ebb4bd9b59319e45.jpg
│   │       ├── ebcd3202623fe7e7.jpg
│   │       ├── ec3af9857feccb97.jpg
│   │       ├── ec504ec2f136df96.jpg
│   │       ├── ec5987912c45a795.jpg
│   │       ├── ec94e8dcfe18822a.jpg
│   │       ├── ecf19295a5c2e056.jpg
│   │       ├── ecfca12ad6a3d53b.jpg
│   │       ├── ed1dd6bf8895df15.jpg
│   │       ├── ed34ebae63f5c330.jpg
│   │       ├── ed73ea97408be22a.jpg
│   │       ├── ed90ac634b7353df.jpg
│   │       ├── ee442843d8e67520.jpg
│   │       ├── ee48e11a3765f86e.jpg
│   │       ├── ee6f97bcbc0c97f6.jpg
│   │       ├── ee8f7c96944cc625.jpg
│   │       ├── ee9200754534eb7b.jpg
│   │       ├── eeb9ddad03ac0530.jpg
│   │       ├── eecb1bd1054cd20f.jpg
│   │       ├── eecd5abb9e90d7bf.jpg
│   │       ├── eed4cd85af4be514.jpg
│   │       ├── ef16f33bcffe5d2f.jpg
│   │       ├── ef40c786459e16eb.jpg
│   │       ├── ef71b420d14b957f.jpg
│   │       ├── efc8796d32265880.jpg
│   │       ├── efd83f416e4f08d7.jpg
│   │       ├── eff157969a14990a.jpg
│   │       ├── effd5e7f39f56474.jpg
│   │       ├── f0087aaae1863a95.jpg
│   │       ├── f0126d3b523320cd.jpg
│   │       ├── f083905eba37850c.jpg
│   │       ├── f13c8d5538b04980.jpg
│   │       ├── f1523b1da5eacfa4.jpg
│   │       ├── f16ff403d9d6c839.jpg
│   │       ├── f19cd893e4786f05.jpg
│   │       ├── f1fa00e7837fae9f.jpg
│   │       ├── f24a5f13a4db3278.jpg
│   │       ├── f26b24e63952d516.jpg
│   │       ├── f291ebbfdcb04929.jpg
│   │       ├── f2ed9826ca3f71b3.jpg
│   │       ├── f2ee61096fd545b2.jpg
│   │       ├── f2f0fd40c1f4e01d.jpg
│   │       ├── f2ffbd2f26204626.jpg
│   │       ├── f31d58bcb7f1bc35.jpg
│   │       ├── f31f7e00d714c2e1.jpg
│   │       ├── f3287384f73383a2.jpg
│   │       ├── f32d5076e19e2ed0.jpg
│   │       ├── f35f8765a373f9e0.jpg
│   │       ├── f36010b3392cf701.jpg
│   │       ├── f3883b80c3742ad4.jpg
│   │       ├── f3899e87a07dc69d.jpg
│   │       ├── f3ae861c9068680d.jpg
│   │       ├── f3d100a80982245e.jpg
│   │       ├── f3f4b8f2a5a6d1e6.jpg
│   │       ├── f41dc4bf73cae217.jpg
│   │       ├── f4a3d770f839627b.jpg
│   │       ├── f5094cd3db4c19c1.jpg
│   │       ├── f53baec8bb516481.jpg
│   │       ├── f564410157eeb19d.jpg
│   │       ├── f617000ab466dddd.jpg
│   │       ├── f66c1dc698cee269.jpg
│   │       ├── f6cda5ae91e5c4ae.jpg
│   │       ├── f6e67c7cb7ddae83.jpg
│   │       ├── f786d6fda71e8d36.jpg
│   │       ├── f7f0576913b0d821.jpg
│   │       ├── f7fa76abcba053cb.jpg
│   │       ├── f868a0fc1168a2c5.jpg
│   │       ├── f9a4aa0c7144ee25.jpg
│   │       ├── f9e4586c5ef79524.jpg
│   │       ├── fa2c58b769227ed1.jpg
│   │       ├── faf74c9bd1130be2.jpg
│   │       ├── fc30e1ced2fabf17.jpg
│   │       ├── fc327a44ca402ccd.jpg
│   │       ├── fc3a63b028ee10f2.jpg
│   │       ├── fc8dfe943bb4bd89.jpg
│   │       ├── fcad86e078d7464a.jpg
│   │       ├── fce9b0ac6d977fc8.jpg
│   │       ├── fcf4bf90e3421646.jpg
│   │       ├── fd0099f175f773a9.jpg
│   │       ├── fd10f2c91efdaf4e.jpg
│   │       ├── fd1ec161d4cd77a7.jpg
│   │       ├── fd27aaea191352e5.jpg
│   │       ├── fd471f3358579b80.jpg
│   │       ├── fd567b14f6e81686.jpg
│   │       ├── fd7d0bc3776faff8.jpg
│   │       ├── fd7f11993749a9f8.jpg
│   │       ├── fd9023ec8e295e7f.jpg
│   │       ├── fdc6c094b396e48e.jpg
│   │       ├── fdf707b46fbf8ed7.jpg
│   │       ├── fe85d4a2284a0303.jpg
│   │       ├── fe8f189c082b2ba9.jpg
│   │       ├── fea7c572bc1f97cd.jpg
│   │       ├── ff00fd51f297d640.jpg
│   │       ├── ff4e65c69f2471bb.jpg
│   │       ├── ff72b1c3656116d7.jpg
│   │       ├── ff76a0a37a19e180.jpg
│   │       ├── ff92343c6a41f680.jpg
│   │       └── ffaed815bc989d95.jpg
├── README.md
├── scripts
│   ├── check-prices.js
│   ├── clear-data.ts
│   ├── delete-smart-data.js
│   ├── generate-master-doc.mjs
│   ├── prisma.js
│   ├── scrape-smart.js
│   ├── scrape-smartworking.js
│   ├── scraperlatest.js
│   ├── setup.sh
│   └── smart-puppeteer.js
├── smart_Baby_p1.html
├── smart_Baby_p1.png
├── smart_Baby_p2.html
├── smart_Baby_p2.png
├── smart_Bakery_p2.html
├── smart_Bakery_p2.png
├── smart_debug
│   ├── scripts
│   │   │   └── scrape.smart.js
│   ├── smart_debug.rar
│   └── smart_debug.zip
├── smart_Drinks_p2.html
├── smart_Drinks_p2.png
├── src
│   ├── components
│   │   │   ├── InvitePanel.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── ListPicker.tsx
│   ├── hooks
│   │   │   └── usePageState.ts
│   ├── lib
│   │   │   ├── api-guards.ts
│   │   │   ├── auth-helpers.ts
│   │   │   ├── mailer.ts
│   │   │   ├── prisma.ts
│   │   │   ├── resend.ts
│   │   │   ├── useHouseholdId.ts
│   │   │   ├── usePageState.ts
│   │   │   └── usePriceSuggestions.ts
│   ├── middleware.ts
│   ├── pages
│   │   │   ├── _app.tsx
│   │   │   ├── api
│   │   │   │   │   │   ├── auth
│   │   │   │   │   │   │   │   │   │   └── [...nextauth].ts
│   │   │   │   │   │   ├── debug
│   │   │   │   │   │   │   │   │   │   └── resend-test.ts
│   │   │   │   │   │   ├── household
│   │   │   │   │   │   │   │   │   │   ├── active.ts
│   │   │   │   │   │   │   │   │   │   ├── create-default.ts
│   │   │   │   │   │   │   │   │   │   ├── invites
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── [id]
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── resend.ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   └── revoke.ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   │   │   │   │   └── members
│   │   │   │   │   │   │   │   │   │   │   │   │   │       ├── [id]
│   │   │   │   │   │   │   │   │   │   │   │   │   │       │   │   │   │       │   └── remove.ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │       └── index.ts
│   │   │   │   │   │   ├── invites
│   │   │   │   │   │   │   │   │   │   └── accept.ts
│   │   │   │   │   │   ├── page-state.ts
│   │   │   │   │   │   ├── prices
│   │   │   │   │   │   │   │   │   │   ├── estimate.ts
│   │   │   │   │   │   │   │   │   │   └── suggest.ts
│   │   │   │   │   │   ├── register.ts
│   │   │   │   │   │   ├── shopping
│   │   │   │   │   │   │   │   │   │   ├── items
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── [id].ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   ├── clear-done.ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │   │   └── index.ts
│   │   │   │   │   │   │   │   │   │   └── lists
│   │   │   │   │   │   │   │   │   │   │   │   │   │       ├── [id].ts
│   │   │   │   │   │   │   │   │   │   │   │   │   │       └── index.ts
│   │   │   │   │   │   └── state.ts
│   │   │   ├── dashboard.tsx
│   │   │   ├── finances.tsx
│   │   │   ├── index.tsx
│   │   │   ├── invites
│   │   │   │   │   │   └── accept.tsx
│   │   │   ├── register.tsx
│   │   │   ├── settings.tsx
│   │   │   └── shopping.tsx
│   ├── styles
│   │   │   └── globals.css
│   └── types
│   │       └── next-auth.d.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.scripts.json
└── tsconfigold.json
```

## 4. Environment & Configuration

### .nvmrc
```
20.11.1

```

### package.json
```json
{
  "name": "houseflow",
  "version": "0.1.0",
  "private": true,
  "prisma": {
    "schema": "prisma/schema.prisma"
  },
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "start": "next start",
    "lint": "next lint",
    "scrape:smart": "node scripts/scrape-smart.js",
    "scrape:smart:headed": "node scripts/scrape-smart.js headed"
  },
  "dependencies": {
    "@prisma/client": "^6.15.0",
    "bcryptjs": "^3.0.2",
    "cuid": "^3.0.0",
    "next": "^14.2.5",
    "next-auth": "^4.24.7",
    "puppeteer": "^24.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "resend": "^6.0.1",
    "swr": "^2.3.6"
  },
  "devDependencies": {
    "@types/node": "^20.4.0",
    "@types/react": "18.2.0",
    "autoprefixer": "^10.4.21",
    "eslint": "8.40.0",
    "eslint-config-next": "14.0.4",
    "globby": "^14.1.0",
    "playwright": "^1.55.0",
    "postcss": "^8.5.6",
    "pretty-bytes": "^7.0.1",
    "prisma": "^6.15.0",
    "tailwindcss": "^3.4.17",
    "ts-node": "^10.9.2",
    "typescript": "^5.2.2"
  }
}

```

### Dockerfile
```dockerfile
# ---- Builder ----
FROM node:20.11.1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy deps manifests + PRISMA SCHEMA before npm ci (important!)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy rest and build Next.js (standalone output)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner (non-standalone; includes node_modules) ----
FROM node:20.11.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

# Copy runtime deps & build output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# (Remove the prisma CLI copy and the entrypoint that ran prisma)
# We’ll run migrations manually once instead of on every boot.

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
```

### captain-definition
```
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}

```

### .caproverignore
```
.git
node_modules
.next/cache
.env
# Force include these
!Dockerfile
!captain-definition
!prisma/**

```

### next.config.js
```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',          // <-- needed for .next/standalone
  reactStrictMode: true,         // optional
  async redirects() {
    return [
      { source: '/api/invites/accept', destination: '/invites/accept', permanent: false },
    ];
  },
};

module.exports = nextConfig;

```

### postcss.config.js
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: { primary: { DEFAULT: '#5562FF', dark: '#3d49b0' } },
    },
  },
  plugins: [],
};

```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node"],
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "src/*"
      ]
    },
    "incremental": true
  },
  
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "src/types"
  ],
  "exclude": [
    "node_modules"
  ]
  
}

```

## 5. Database (Prisma)

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model PageState {
  id          String   @id @default(cuid())
  householdId String
  page        String
  data        Json
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  @@unique([householdId, page])
}

model User {
  id                     String         @id @default(cuid())
  name                   String?
  email                  String         @unique
  password               String
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
  activeHouseholdId      String?
  ownedHouseholds        Household[]    @relation("OwnerHouseholds")
  memberships            Membership[]
  shoppingItemsCreated   ShoppingItem[] @relation("ShoppingItemCreatedBy")
  shoppingItemsCompleted ShoppingItem[] @relation("ShoppingItemDoneBy")
  activeHousehold        Household?     @relation("ActiveHousehold", fields: [activeHouseholdId], references: [id])
}

model Household {
  id             String         @id @default(cuid())
  name           String
  ownerId        String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  owner          User           @relation("OwnerHouseholds", fields: [ownerId], references: [id])
  invites        Invite[]
  members        Membership[]
  shoppingLists  ShoppingList[]
  activeForUsers User[]         @relation("ActiveHousehold")
}

model Membership {
  id          String     @id @default(cuid())
  userId      String
  householdId String
  role        MemberRole @default(MEMBER)
  createdAt   DateTime   @default(now())
  household   Household  @relation(fields: [householdId], references: [id])
  user        User       @relation(fields: [userId], references: [id])

  @@unique([userId, householdId], name: "userId_householdId")
  @@index([householdId])
}

model Invite {
  id           String       @id @default(cuid())
  householdId  String
  email        String?
  role         MemberRole   @default(MEMBER)
  token        String       @unique
  status       InviteStatus @default(PENDING)
  expiresAt    DateTime
  invitedById  String
  acceptedById String?
  acceptedAt   DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  household    Household    @relation(fields: [householdId], references: [id])
}

model ShoppingList {
  id          String         @id @default(cuid())
  householdId String
  name        String
  archivedAt  DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  items       ShoppingItem[]
  household   Household      @relation(fields: [householdId], references: [id])

  @@unique([householdId, name], name: "householdId_name_unique")
  @@index([householdId])
}

model ShoppingItem {
  id          String             @id @default(cuid())
  listId      String
  title       String
  qty         String?
  notes       String?
  category    String?
  store       String?
  status      ShoppingItemStatus @default(ACTIVE)
  createdById String
  doneById    String?
  doneAt      DateTime?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  createdBy   User               @relation("ShoppingItemCreatedBy", fields: [createdById], references: [id])
  doneBy      User?              @relation("ShoppingItemDoneBy", fields: [doneById], references: [id])
  list        ShoppingList       @relation(fields: [listId], references: [id])

  @@index([listId])
  @@index([status])
  @@index([updatedAt])
}

model Store {
  id        String         @id @default(cuid())
  name      String
  domain    String         @unique
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  offers    PriceOffer[]
  products  PriceProduct[]
}

model PriceProduct {
  id             String       @id @default(cuid())
  storeId        String
  name           String
  brand          String?
  sku            String?
  sourceUrl      String       @unique
  imageUrl       String?
  nameNormalized String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  offers         PriceOffer[] @relation("ProductOffers")
  store          Store        @relation(fields: [storeId], references: [id])

  @@index([storeId, nameNormalized])
}

model PriceOffer {
  id         String       @id @default(cuid())
  productId  String
  priceCents Int
  currency   String       @default("EUR")
  unit       String?
  scrapedAt  DateTime     @default(now())
  storeId    String?
  category   String?
  product    PriceProduct @relation("ProductOffers", fields: [productId], references: [id])
  Store      Store?       @relation(fields: [storeId], references: [id])

  @@index([productId, scrapedAt])
}

enum MemberRole {
  OWNER
  MEMBER
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}

enum ShoppingItemStatus {
  ACTIVE
  DONE
}

```

### Migrations (summaries)

#### prisma/migrations/000_init/migration.sql
```sql
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."PageState" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PageState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageState_householdId_page_key" ON "public"."PageState"("householdId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");


```

#### prisma/migrations/20250819133233_invites_schema/migration.sql
```sql
-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "email" TEXT,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_householdId_idx" ON "public"."Membership"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_householdId_key" ON "public"."Membership"("userId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "public"."Invite"("token");

-- AddForeignKey
ALTER TABLE "public"."Household" ADD CONSTRAINT "Household_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### prisma/migrations/20250822110757_add_active_household_to_user/migration.sql
```sql
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "activeHouseholdId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_activeHouseholdId_fkey" FOREIGN KEY ("activeHouseholdId") REFERENCES "public"."Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

```

#### prisma/migrations/20250825094835_shopping_lists_items_backrel/migration.sql
```sql
-- CreateEnum
CREATE TYPE "public"."ShoppingItemStatus" AS ENUM ('ACTIVE', 'DONE');

-- CreateTable
CREATE TABLE "public"."ShoppingList" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShoppingItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "qty" TEXT,
    "notes" TEXT,
    "category" TEXT,
    "store" TEXT,
    "status" "public"."ShoppingItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingList_householdId_idx" ON "public"."ShoppingList"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_householdId_name_key" ON "public"."ShoppingList"("householdId", "name");

-- CreateIndex
CREATE INDEX "ShoppingItem_listId_idx" ON "public"."ShoppingItem"("listId");

-- CreateIndex
CREATE INDEX "ShoppingItem_status_idx" ON "public"."ShoppingItem"("status");

-- CreateIndex
CREATE INDEX "ShoppingItem_updatedAt_idx" ON "public"."ShoppingItem"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."ShoppingList" ADD CONSTRAINT "ShoppingList_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "public"."Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."ShoppingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShoppingItem" ADD CONSTRAINT "ShoppingItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

#### prisma/migrations/20250825132405_add_price_scraper_tables/migration.sql
```sql
-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "sku" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "nameNormalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceOffer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "unit" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT,

    CONSTRAINT "PriceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_domain_key" ON "public"."Store"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "PriceProduct_sourceUrl_key" ON "public"."PriceProduct"("sourceUrl");

-- CreateIndex
CREATE INDEX "PriceProduct_storeId_nameNormalized_idx" ON "public"."PriceProduct"("storeId", "nameNormalized");

-- CreateIndex
CREATE INDEX "PriceOffer_productId_scrapedAt_idx" ON "public"."PriceOffer"("productId", "scrapedAt");

-- AddForeignKey
ALTER TABLE "public"."PriceProduct" ADD CONSTRAINT "PriceProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceOffer" ADD CONSTRAINT "PriceOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."PriceProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceOffer" ADD CONSTRAINT "PriceOffer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

#### prisma/migrations/20250825144731_add_category_to_price_offer/migration.sql
```sql
-- AlterTable
ALTER TABLE "public"."PriceOffer" ADD COLUMN     "category" TEXT;

```

## 6. Application Code (Key Files)

### src/pages/_app.tsx
```ts
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import "../styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
```

### src/pages/dashboard.tsx
```ts
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useMemo, useState } from 'react';

type SplitMethod = 'equal' | 'proportional';
type Earner = { id: string; name: string; salary: number };
type Account = { id: string; name: string; target: number; isSavings?: boolean };

const STORAGE_KEY = 'houseflow_finance_v1';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'monthly',  name: 'Monthly Expense', target: 0 },
  { id: 'expenses', name: 'Expenses',        target: 0 },
  { id: 'savings',  name: 'Savings',         target: 0, isSavings: true },
];

const newId = () => Math.random().toString(36).slice(2, 9);
const toMoney = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [earners, setEarners] = useState<Earner[]>([{ id: newId(), name: 'You', salary: 0 }]);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [startingSavings, setStartingSavings] = useState<number>(0);
  const [months, setMonths] = useState<number>(12);

  // Load/save (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.earners) setEarners(parsed.earners);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.splitMethod) setSplitMethod(parsed.splitMethod);
        if (typeof parsed.startingSavings === 'number') setStartingSavings(parsed.startingSavings);
        if (typeof parsed.months === 'number') setMonths(parsed.months);
      }
    } catch (e) {
      console.warn('Failed to parse saved finance state', e);
    }
  }, []);

  useEffect(() => {
    const blob = { earners, accounts, splitMethod, startingSavings, months };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  }, [earners, accounts, splitMethod, startingSavings, months]);

  const totalIncome = useMemo(
    () => earners.reduce((s, e) => s + (Number.isFinite(e.salary) ? e.salary : 0), 0),
    [earners]
  );

  // Contribution calculator
  function contributionFor(target: number, earner: Earner) {
    if (target <= 0 || earners.length === 0) return 0;
    if (splitMethod === 'equal') return target / earners.length;
    if (totalIncome <= 0) return 0;
    return target * (earner.salary / totalIncome);
  }

  const savingsAccount = accounts.find(a => a.isSavings);
  const monthlySavings = savingsAccount?.target ?? 0;

  // Projection array
  const projection = useMemo(() => {
    const arr: { month: number; balance: number }[] = [];
    let bal = startingSavings;
    for (let i = 1; i <= Math.max(1, months); i++) {
      bal += monthlySavings; // no interest for v1
      arr.push({ month: i, balance: bal });
    }
    return arr;
  }, [startingSavings, months, monthlySavings]);

  // Helpers to mutate state
  const updateEarner = (id: string, patch: Partial<Earner>) =>
    setEarners(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const removeEarner = (id: string) =>
    setEarners(prev => prev.filter(e => e.id !== id));

  const addEarner = () =>
    setEarners(prev => [...prev, { id: newId(), name: `Member ${prev.length + 1}`, salary: 0 }]);

  const updateAccount = (id: string, patch: Partial<Account>) =>
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));

  const removeAccount = (id: string) =>
    setAccounts(prev => prev.filter(a => a.id !== id));

  const addAccount = () =>
    setAccounts(prev => [...prev, { id: newId(), name: `Account ${prev.length + 1}`, target: 0 }]);

  const setAsSavings = (id: string) =>
    setAccounts(prev => prev.map(a => ({ ...a, isSavings: a.id === id })));

  const resetAll = () => {
    setEarners([{ id: newId(), name: 'You', salary: 0 }]);
    setAccounts(DEFAULT_ACCOUNTS);
    setSplitMethod('equal');
    setStartingSavings(0);
    setMonths(12);
  };

  return (
    <Layout>
      <Head><title>Finances – HouseFlow</title></Head>

      <h2 className="text-3xl font-semibold mb-4">Household Finances</h2>
      <p className="mb-6 text-gray-700">
        Enter earners and monthly account targets. Choose a split method to see recommended
        contributions per person. The Savings projection uses the monthly target for the “Savings” account.
      </p>

      {/* Split method */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="font-medium">Split method:</label>
        <select
          className="border rounded px-3 py-2"
          value={splitMethod}
          onChange={(e) => setSplitMethod(e.target.value as SplitMethod)}
        >
          <option value="equal">Equal (50/50, or equal among members)</option>
          <option value="proportional">Proportional (by salary)</option>
        </select>
        <button onClick={resetAll} className="ml-auto border px-3 py-2 rounded hover:bg-gray-100">
          Reset to defaults
        </button>
      </div>

      {/* Earners */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">Earners</h3>
            <button onClick={addEarner} className="border px-3 py-2 rounded hover:bg-gray-50">Add earner</button>
          </div>
          <div className="space-y-3">
            {earners.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <input
                  className="border rounded px-3 py-2 flex-1"
                  value={e.name}
                  onChange={(ev) => updateEarner(e.id, { name: ev.target.value })}
                  placeholder="Name"
                />
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-40"
                  value={e.salary}
                  min={0}
                  onChange={(ev) => updateEarner(e.id, { salary: Number(ev.target.value || 0) })}
                  placeholder="Salary €"
                />
                {earners.length > 1 && (
                  <button onClick={() => removeEarner(e.id)} className="text-sm text-red-600 hover:underline">
                    remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">Total income: <b>{toMoney(totalIncome)}</b></div>
        </div>

        {/* Accounts */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">Accounts & Monthly Targets</h3>
            <button onClick={addAccount} className="border px-3 py-2 rounded hover:bg-gray-50">Add account</button>
          </div>
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <input
                  className="border rounded px-3 py-2 flex-1"
                  value={a.name}
                  onChange={(ev) => updateAccount(a.id, { name: ev.target.value })}
                  placeholder="Account name"
                />
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-40"
                  value={a.target}
                  min={0}
                  onChange={(ev) => updateAccount(a.id, { target: Number(ev.target.value || 0) })}
                  placeholder="Target €"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!!a.isSavings}
                    onChange={() => setAsSavings(a.id)}
                  />
                  Savings
                </label>
                {!a.isSavings && (
                  <button onClick={() => removeAccount(a.id)} className="text-sm text-red-600 hover:underline">
                    remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contributions table */}
      <div className="bg-white rounded-xl shadow p-4 mt-6 overflow-auto">
        <h3 className="text-xl font-semibold mb-3">Recommended Contributions</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Account</th>
              {earners.map(e => (<th key={e.id} className="py-2 pr-4">{e.name}</th>))}
              <th className="py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => {
              const perEarner = earners.map(e => contributionFor(a.target, e));
              const total = perEarner.reduce((s, n) => s + n, 0);
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  {perEarner.map((n, i) => (<td key={i} className="py-2 pr-4">{toMoney(n)}</td>))}
                  <td className="py-2">{toMoney(total)}</td>
                </tr>
              );
            })}
            {/* totals per earner */}
            <tr className="font-semibold">
              <td className="py-2 pr-4">Total per person</td>
              {earners.map(e => {
                const sum = accounts.reduce((s, a) => s + contributionFor(a.target, e), 0);
                return <td key={e.id} className="py-2 pr-4">{toMoney(sum)}</td>;
              })}
              <td className="py-2">
                {toMoney(accounts.reduce((s, a) => s + a.target, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Savings projection */}
      <div className="bg-white rounded-xl shadow p-4 mt-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xl font-semibold">Savings Projection</h3>
          <div className="flex items-center gap-3 text-sm">
            <label>Starting balance (€)
              <input
                type="number"
                className="border rounded px-2 py-1 ml-2 w-32"
                value={startingSavings}
                min={0}
                onChange={(e) => setStartingSavings(Number(e.target.value || 0))}
              />
            </label>
            <label>Months
              <input
                type="number"
                className="border rounded px-2 py-1 ml-2 w-20"
                value={months}
                min={1}
                onChange={(e) => setMonths(Math.max(1, Number(e.target.value || 1)))}
              />
            </label>
          </div>
        </div>
        <p className="text-gray-600 mb-3">
          Using monthly savings target: <b>{toMoney(monthlySavings)}</b>
        </p>
        <div className="overflow-auto">
          <table className="min-w-[400px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2">Projected Balance</th>
              </tr>
            </thead>
            <tbody>
              {projection.map(row => (
                <tr key={row.month} className="border-b">
                  <td className="py-2 pr-4">{row.month}</td>
                  <td className="py-2">{toMoney(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

```

### src/pages/finances.tsx
```ts
// src/pages/finances.tsx
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePageState } from '../hooks/usePageState'; // { value, setValue, loading, saving, error, saveNow }
import { useSession } from 'next-auth/react';
import { useHouseholdId } from '../lib/useHouseholdId';

type SplitMethod = 'equal' | 'proportional';
type Earner = { id: string; name: string; salary: number; keep: number };

// NEW: expense model for an account (UI + persisted in PageState)
type ExpenseCadence = 'monthly' | 'yearly';
type Expense = { id: string; name: string; amount: number; cadence: ExpenseCadence };

type Account = {
  id: string;
  name: string;
  target: number;
  isSavings?: boolean;
  // NEW: known expenses attached to this account (persisted as part of accounts[])
  expenses?: Expense[];
};

const newId = () => Math.random().toString(36).slice(2, 9);
const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

const SAVINGS_TEMPLATES: { key: string; label: string; pct: number }[] = [
  { key: 'classic20',    label: 'Classic 20% (50/30/20, 80/20, 70/20/10)', pct: 20 },
  { key: 'light10',      label: 'Light 10% (60/30/10)',                    pct: 10 },
  { key: 'retire15',     label: 'Retirement 15%',                           pct: 15 },
  { key: 'aggressive30', label: 'Aggressive 30%',                           pct: 30 },
  { key: 'sprint40',     label: 'Emergency sprint 40%',                     pct: 40 },
];

/* --- tiny chip used for the selected account hint (optional) --- */
const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 text-[10px] uppercase tracking-wide border border-fuchsia-200">
    {children}
  </span>
);

export default function FinancesPage() {
  const { status } = useSession();
  const { householdId, loading: hidLoading, error: hidError } = useHouseholdId();

  if (status === 'loading' || hidLoading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading…</div>
      </Layout>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className="p-6 text-red-600">Sign in required</div>
      </Layout>
    );
  }
  if (!householdId) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
          Creating or locating your household…
        </div>
      </Layout>
    );
  }

  return <FinancesCore householdId={householdId} hidError={hidError} />;
}

function FinancesCore({ householdId, hidError }: { householdId: string; hidError?: string | null }) {
  // ----- Local UI state (mirrors persisted) -----
  const [earners, setEarners] = useState<Earner[]>([
    { id: newId(), name: 'You',     salary: 0, keep: 0 },
    { id: newId(), name: 'Partner', salary: 0, keep: 0 },
  ]);
  const [accounts, setAccounts] = useState<Account[]>([
    { id: newId(), name: 'Monthly Expense', target: 0, expenses: [] },
    { id: newId(), name: 'Expenses',        target: 0, expenses: [] },
  ]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [months, setMonths] = useState(12);
  const [startingSavings, setStartingSavings] = useState(0);
  const [savingsPct, setSavingsPct] = useState(20);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('classic20');
  const [equalKeepInput, setEqualKeepInput] = useState(0);

  // NEW: focused account (click a card to expand its known expenses)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  type FinanceState = {
    earners: Earner[];
    accounts: Account[]; // includes expenses[] now
    splitMethod: SplitMethod;
    months: number;
    startingSavings: number;
    savingsPct: number;
    selectedTemplateKey: string;
  };

  // ----- Persisted state hook (debounced) -----
  const {
    value,
    setValue,
    loading: psLoading,
    saving: psSaving,
    error: psError,
    saveNow,
  } = usePageState<FinanceState>({
    householdId,
    page: 'finances',
    initial: {
      earners,
      accounts,
      splitMethod,
      months,
      startingSavings,
      savingsPct,
      selectedTemplateKey,
    },
    saveDelayMs: 700,
  });

  // ----- Hydrate only once to prevent racing with user typing -----
  const [didHydrate, setDidHydrate] = useState(false);
  useEffect(() => {
    if (psLoading || didHydrate) return;
    if (value?.earners) setEarners(value.earners);
    if (value?.accounts) setAccounts(value.accounts);
    if (value?.splitMethod) setSplitMethod(value.splitMethod);
    if (typeof value?.months === 'number') setMonths(value.months);
    if (typeof value?.startingSavings === 'number') setStartingSavings(value.startingSavings);
    if (typeof value?.savingsPct === 'number') setSavingsPct(value.savingsPct);
    if (typeof value?.selectedTemplateKey === 'string') setSelectedTemplateKey(value.selectedTemplateKey);
    setDidHydrate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psLoading, value, didHydrate]);

  // ----- Persist on change (after initial hydration) -----
  useEffect(() => {
    if (psLoading || !didHydrate) return;
    setValue({
      earners,
      accounts,
      splitMethod,
      months,
      startingSavings,
      savingsPct,
      selectedTemplateKey,
    });
  }, [psLoading, didHydrate, earners, accounts, splitMethod, months, startingSavings, savingsPct, selectedTemplateKey, setValue]);

  // ----- Derived values -----
  const totalIncome = useMemo(() => earners.reduce((s, e) => s + (e.salary || 0), 0), [earners]);
  const totalKeep   = useMemo(() => earners.reduce((s, e) => s + (e.keep   || 0), 0), [earners]);

  const availableForHouse = Math.max(0, totalIncome - totalKeep);
  const autoSavingsTarget = Math.max(0, availableForHouse * (savingsPct / 100));
  const poolAfterSavings  = Math.max(0, availableForHouse - autoSavingsTarget);
  const allocatedTargets  = accounts.reduce((s, a) => s + (a.target || 0), 0);
  const overAlloc         = allocatedTargets > poolAfterSavings;

  const baseForProportional = Math.max(0, earners.reduce((s, e) => s + Math.max(0, e.salary - e.keep), 0));
  const weight = (e: Earner) => {
    const base = Math.max(0, e.salary - e.keep);
    return baseForProportional > 0 ? base / baseForProportional : 0;
  };
  const split = (target: number, e: Earner) =>
    target <= 0 || earners.length === 0
      ? 0
      : splitMethod === 'equal'
      ? target / earners.length
      : baseForProportional > 0 ? target * weight(e) : target / earners.length;

  const projection = useMemo(() => {
    const arr: { m: number; bal: number }[] = [];
    let bal = startingSavings;
    for (let i = 1; i <= Math.max(1, months); i++) { bal += autoSavingsTarget; arr.push({ m: i, bal }); }
    return arr;
  }, [startingSavings, months, autoSavingsTarget]);

  // ----- Known-expense helpers -----
  const monthlyFromExpense = (ex: Expense) => ex.cadence === 'monthly' ? ex.amount : ex.amount / 12;
  const accountMonthlyKnownTotal = (a: Account) =>
    (a.expenses ?? []).reduce((s, ex) => s + monthlyFromExpense(ex), 0);

  const addKnownExpense = (accountId: string) => {
    setAccounts(prev =>
      prev.map(a => a.id !== accountId ? a : ({
        ...a,
        expenses: [
          ...(a.expenses ?? []),
          { id: newId(), name: 'New expense', amount: 0, cadence: 'monthly' as ExpenseCadence }
        ]
      }))
    );
  };

  const updateKnownExpense = (accountId: string, expenseId: string, patch: Partial<Expense>) => {
    setAccounts(prev =>
      prev.map(a => a.id !== accountId ? a : ({
        ...a,
        expenses: (a.expenses ?? []).map(ex => ex.id === expenseId ? { ...ex, ...patch } : ex)
      }))
    );
  };

  const removeKnownExpense = (accountId: string, expenseId: string) => {
    setAccounts(prev =>
      prev.map(a => a.id !== accountId ? a : ({
        ...a,
        expenses: (a.expenses ?? []).filter(ex => ex.id !== expenseId)
      }))
    );
  };

  const applyKnownToTarget = (accountId: string) => {
    setAccounts(prev =>
      prev.map(a => a.id !== accountId ? a : ({
        ...a,
        target: Math.max(0, Math.round(accountMonthlyKnownTotal(a) * 100) / 100)
      }))
    );
  };

  // ----- Mutators -----
  const updateEarner  = (id: string, patch: Partial<Earner>) => setEarners(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
  const addEarner     = () => setEarners(p => [...p, { id: newId(), name: `Member ${p.length+1}`, salary: 0, keep: 0 }]);
  const handleRemoveEarner = (id: string) => { if (earners.length > 1) setEarners(p => p.filter(e => e.id !== id)); };

  const updateAccount = (id: string, patch: Partial<Account>) => setAccounts(p => p.map(a => a.id === id ? { ...a, ...patch } : a));
  const addAccount    = () => setAccounts(p => [...p, { id: newId(), name: `Account ${p.length+1}`, target: 0, expenses: [] }]);
  const removeAccount = (id: string) => setAccounts(p => p.filter(a => a.id !== id));

  const setEqualKeeps = (k: number) => setEarners(prev => prev.map(e => ({ ...e, keep: Math.max(0, k) })));
  const computeMaxEqualKeep = () => {
    const n = Math.max(1, earners.length);
    const S = totalIncome;
    const T = allocatedTargets;
    const P = Math.min(0.9999, Math.max(0, savingsPct / 100));
    const denom = (1 - P);
    if (denom <= 0) return 0;
    const rawK = (S - (T / denom)) / n;
    const k = Math.max(0, Math.min(rawK, ...earners.map(e => e.salary)));
    return isFinite(k) ? k : 0;
  };
  const applyMaxEqualKeep = () => {
    const k = computeMaxEqualKeep();
    setEqualKeeps(k);
    setEqualKeepInput(Number(k.toFixed(2)));
  };

  const reset = () => {
    setEarners([
      { id: newId(), name: 'You', salary: 0, keep: 0 },
      { id: newId(), name: 'Partner', salary: 0, keep: 0 },
    ]);
    setAccounts([
      { id: newId(), name: 'Monthly Expense', target: 0, expenses: [] },
      { id: newId(), name: 'Expenses',        target: 0, expenses: [] },
    ]);
    setSplitMethod('equal'); setMonths(12); setStartingSavings(0);
    setSavingsPct(20); setSelectedTemplateKey('classic20'); setEqualKeepInput(0);
    setSelectedAccountId(null);
  };

  return (
    <Layout>
      <Head><title>Finances – HouseFlow</title></Head>

      {/* Header */}
      <section className="mx-4 sm:mx-6 mt-4 rounded-3xl bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white p-6 sm:p-7 shadow">
        <h1 className="text-xl sm:text-2xl font-semibold">Household Finances</h1>
        <div className="mt-2 text-xs text-white/80">
          Household:&nbsp;<span className="font-mono">{householdId || '—'}</span>
        </div>
        {hidError && <div className="mt-2 text-xs text-rose-100">{hidError}</div>}
        <div className="mt-2 text-[11px]">
          {psLoading ? 'Loading…' : psSaving ? 'Saving…' : psError ? <span className="text-rose-100">{psError}</span> : 'All changes saved'}
        </div>
      </section>

      {/* Summary */}
      <div className="rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 mx-4 sm:mx-6 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Summary</h2>
            <p className="opacity-95 text-sm sm:text-base">
              Personal keeps → account targets → <b>savings by %</b>. Mobile-first, family-friendly.
            </p>
          </div>
          <button
            onClick={() => saveNow?.()}
            className="rounded-xl border border-white/40 bg-white/15 px-3 py-1.5 text-xs hover:bg-white/20"
            title="Persist current values"
          >
            Save now
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-[13px] sm:text-sm">
          <div className="bg-white/15 rounded-lg p-3">
            <div className="opacity-80">Total income</div><div className="font-semibold">{money(totalIncome)}</div>
          </div>
          <div className="bg-white/15 rounded-lg p-3">
            <div className="opacity-80">Personal keeps</div><div className="font-semibold">{money(totalKeep)}</div>
          </div>
          <div className="bg-white/15 rounded-lg p-3">
            <div className="opacity-80">Savings %</div><div className="font-semibold">{savingsPct}%</div>
          </div>
          <div className="bg-white/15 rounded-lg p-3">
            <div className="opacity-80">Savings (auto)</div><div className="font-semibold">{money(autoSavingsTarget)}</div>
          </div>
          <div className={`${overAlloc ? 'bg-red-600/80' : 'bg-white/15'} rounded-lg p-3`}>
            <div className="opacity-80">Pool after savings</div><div className="font-semibold">{money(poolAfterSavings)}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-3 mb-5 mx-4 sm:mx-6">
        <div className="flex items-center gap-3">
          <label className="font-medium text-sm sm:text-base">Split</label>
          <select
            value={splitMethod}
            onChange={(e) => setSplitMethod(e.target.value as SplitMethod)}
            className="px-3 py-2 border rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="equal">Equal (even split)</option>
            <option value="proportional">Proportional (by salary − keep)</option>
          </select>
          <button onClick={reset} className="ml-auto px-3 py-2 rounded-md border hover:bg-gray-50">Reset</button>
        </div>
      </div>

      {/* Earners + Accounts + rest of UI */}
      <div className="mx-4 sm:mx-6">
        {/* Savings settings */}
        <section className="bg-white rounded-2xl shadow p-4 sm:p-5 mb-6">
          <h3 className="text-lg font-semibold text-fuchsia-700 mb-3">Savings</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedTemplateKey}
                onChange={(e) => {
                  setSelectedTemplateKey(e.target.value);
                  const t = SAVINGS_TEMPLATES.find(x => x.key === e.target.value);
                  if (t) setSavingsPct(t.pct);
                }}
              >
                {SAVINGS_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <p className="text-xs text-gray-600 mt-1">Pick a rule-of-thumb; tweak the % below.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Savings percentage</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="number"
                  className="w-20 border rounded px-2 py-1"
                  value={savingsPct}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e)=>setSavingsPct(Math.max(0, Math.min(100, Number(e.target.value || 0))))}
                />
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  className="flex-1"
                  value={savingsPct}
                  onChange={(e)=>setSavingsPct(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Savings is taken first from the household pool (income − keeps). Remainder funds your other accounts.
              </p>
            </div>
          </div>

          {overAlloc && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 text-red-700 p-3">
              Your account targets ({money(allocatedTargets)}) exceed the pool after savings ({money(poolAfterSavings)}).
            </div>
          )}
        </section>

        {/* Earners + Accounts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Earners */}
          <section className="bg-white rounded-2xl shadow p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-indigo-700">Earners</h3>
              <button onClick={addEarner} className="px-3 py-2 rounded-md border hover:bg-gray-50">Add earner</button>
            </div>

            {/* Keep tools */}
            <div className="rounded-xl border p-3 mb-3 bg-indigo-50/40">
              <div className="text-sm font-medium mb-2">Keep tools</div>
              <div className="grid gap-2 sm:flex sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Equal keep per earner (€)</span>
                  <input
                    type="number"
                    min={0}
                    value={equalKeepInput}
                    onChange={(e)=>setEqualKeepInput(Number(e.target.value || 0))}
                    className="border rounded px-2 py-1 w-28 placeholder-gray-400"
                  />
                  <button onClick={()=>setEqualKeeps(equalKeepInput)} className="px-3 py-2 rounded-md border hover:bg-gray-50">Apply</button>
                </div>
                <button onClick={applyMaxEqualKeep} className="px-3 py-2 rounded-md border hover:bg-gray-50 w-full sm:w-auto">
                  Max equal keep we can afford
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                We clamp to the feasible maximum after taking savings first.
              </p>
            </div>

            <div className="space-y-3">
              {earners.map((e, idx) => (
                <div
                  key={e.id}
                  className="rounded-xl border p-3 grid gap-3 sm:grid-cols-4 items-center overflow-hidden"
                >
                  <input
                    className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={e.name}
                    onChange={(ev) => updateEarner(e.id, { name: ev.target.value })}
                    placeholder={`Member ${idx + 1}`}
                  />
                  <input
                    type="number"
                    min={0}
                    className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={e.salary}
                    onChange={(ev) => updateEarner(e.id, { salary: Number(ev.target.value || 0) })}
                    placeholder="Salary €"
                  />
                  <input
                    type="number"
                    min={0}
                    className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={e.keep}
                    onChange={(ev) => updateEarner(e.id, { keep: Number(ev.target.value || 0) })}
                    placeholder="Personal keep €"
                  />
                  <button
                    onClick={() => handleRemoveEarner(e.id)}
                    disabled={earners.length <= 1}
                    title={earners.length <= 1 ? 'At least one earner is required' : 'Remove earner'}
                    className={`justify-self-start sm:justify-self-end px-3 py-2 rounded-md border transition
                      ${earners.length <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 text-red-600'}`}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Accounts */}
          <section className="bg-white rounded-2xl shadow p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-violet-700">Accounts (monthly targets)</h3>
              <button onClick={addAccount} className="px-3 py-2 rounded-md border hover:bg-gray-50">Add account</button>
            </div>

            <div className="space-y-3">
              {accounts.map((a) => {
                const isSelected = selectedAccountId === a.id;
                const monthlyKnown = accountMonthlyKnownTotal(a);

                return (
                  <div
                    key={a.id}
                    className={[
                      "rounded-xl border p-3 grid gap-3 sm:grid-cols-3 items-start overflow-hidden transition",
                      isSelected ? "ring-2 ring-fuchsia-400/60" : "hover:shadow-sm"
                    ].join(" ")}
                  >
                    {/* base row */}
                    <div
                      className="sm:col-span-3 grid gap-3 sm:grid-cols-3 items-center cursor-pointer"
                      onClick={() => setSelectedAccountId(isSelected ? null : a.id)}
                      title="Click to view known expenses"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                          value={a.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(ev) => updateAccount(a.id, { name: ev.target.value })}
                          placeholder="Account name"
                        />
                        {isSelected && <Badge>Selected</Badge>}
                      </div>

                      <input
                        type="number"
                        min={0}
                        className="border rounded-md px-3 py-2 w-full min-w-0 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        value={a.target}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(ev) => updateAccount(a.id, { target: Number(ev.target.value || 0) })}
                        placeholder="Target €"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-600">
                          Known (per month): <b>{money(monthlyKnown)}</b>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAccount(a.id); if (isSelected) setSelectedAccountId(null); }}
                          className="justify-self-start sm:justify-self-end px-3 py-2 rounded-md border hover:bg-gray-50 text-red-600"
                        >
                          remove
                        </button>
                      </div>
                    </div>

                    {/* expanded known expenses editor */}
                    {isSelected && (
                      <div className="sm:col-span-3 mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800">Known expenses</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => addKnownExpense(a.id)}
                              className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs"
                            >
                              + Add expense
                            </button>
                            <button
                              onClick={() => applyKnownToTarget(a.id)}
                              className="px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-xs"
                              title="Copy per-month known total to this account's target"
                            >
                              Set target to known expenses
                            </button>
                          </div>
                        </div>

                        {(a.expenses ?? []).length === 0 ? (
                          <div className="text-xs text-gray-600 mt-2">
                            No known expenses yet. Click <b>+ Add expense</b> to start.
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {(a.expenses ?? []).map((ex) => (
                              <div key={ex.id} className="grid gap-2 sm:grid-cols-12 items-center bg-white rounded-lg border p-2">
                                <input
                                  className="sm:col-span-5 border rounded px-2 py-1 text-sm"
                                  value={ex.name}
                                  onChange={(e)=>updateKnownExpense(a.id, ex.id, { name: e.target.value })}
                                  placeholder="Name (e.g., Rent, Insurance)"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  className="sm:col-span-3 border rounded px-2 py-1 text-sm"
                                  value={ex.amount}
                                  onChange={(e)=>updateKnownExpense(a.id, ex.id, { amount: Number(e.target.value || 0) })}
                                  placeholder="Amount €"
                                />
                                <select
                                  className="sm:col-span-3 border rounded px-2 py-1 text-sm"
                                  value={ex.cadence}
                                  onChange={(e)=>updateKnownExpense(a.id, ex.id, { cadence: e.target.value as ExpenseCadence })}
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="yearly">Yearly</option>
                                </select>
                                <button
                                  onClick={()=>removeKnownExpense(a.id, ex.id)}
                                  className="sm:col-span-1 justify-self-end px-2 py-1 rounded-md border text-red-600 text-xs hover:bg-gray-50"
                                >
                                  -
                                </button>
                                <div className="sm:col-span-12 text-[11px] text-gray-600">
                                  Per month: <b>{money(monthlyFromExpense(ex))}</b>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-600">
                          Tip: Mark **Yearly** items (e.g., insurance) — we convert to monthly by dividing by 12.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Contributions */}
        <section className="bg-white rounded-2xl shadow p-4 sm:p-5 mt-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-fuchsia-700 mb-2">Recommended Contributions</h3>
          <table className="min-w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Account</th>
                {earners.map(e => <th key={e.id} className="py-2 pr-4">{e.name}</th>)}
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...accounts, { id: 'savings', name: `Savings (auto ${savingsPct}%)`, target: autoSavingsTarget, isSavings: true }].map(a => {
                const per = earners.map(e => split(a.target, e));
                const total = per.reduce((s, n) => s + n, 0);
                return (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{a.name}</td>
                    {per.map((n, i) => <td key={i} className="py-2 pr-4">{money(n)}</td>)}
                    <td className="py-2">{money(total)}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td className="py-2 pr-4">Total per person</td>
                {earners.map(e => {
                  const sum = accounts.reduce((s, a) => s + split(a.target, e), 0) + split(autoSavingsTarget, e);
                  return <td key={e.id} className="py-2 pr-4">{money(sum)}</td>;
                })}
                <td className="py-2">{money(allocatedTargets + autoSavingsTarget)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Savings Projection */}
        <section className="bg-white rounded-2xl shadow p-4 sm:p-5 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-indigo-700">Savings Projection</h3>
            <div className="flex items-center gap-3 text-sm">
              <label>Starting balance (€)
                <input
                  type="number" className="border rounded px-2 py-1 ml-2 w-28"
                  value={startingSavings} min={0}
                  onChange={(e) => setStartingSavings(Number(e.target.value || 0))}
                />
              </label>
              <label>Months
                <input
                  type="number" className="border rounded px-2 py-1 ml-2 w-20"
                  value={months} min={1}
                  onChange={(e) => setMonths(Math.max(1, Number(e.target.value || 1)))}
                />
              </label>
            </div>
          </div>
          <p className="text-gray-600 mb-2 text-sm sm:text-base">Monthly savings used: <b>{money(autoSavingsTarget)}</b></p>
          <div className="overflow-x-auto">
            <table className="min-w-[380px] text-xs sm:text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-4">Month</th><th className="py-2">Projected Balance</th></tr></thead>
              <tbody>
                {projection.map(r => (
                  <tr key={r.m} className="border-b">
                    <td className="py-2 pr-4">{r.m}</td>
                    <td className="py-2">{money(r.bal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}

```

### src/pages/index.tsx
```ts
// src/pages/index.tsx
import { FormEvent, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const callbackUrl = useMemo(() => {
    const n = router.query.next;
    return typeof n === 'string' && n.startsWith('/') ? n : '/finances';
  }, [router.query.next]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace(callbackUrl);
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (!res?.ok) {
      setErr('Invalid credentials');
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <>
      <Head><title>Sign in – HouseFlow</title></Head>
      <main className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Combined card with glass header */}
          <div className="overflow-hidden rounded-3xl shadow-xl">
            {/* Glass logo header */}
            <div className="bg-white/10 backdrop-blur-md border-b border-white/20 flex justify-center py-6">
              <Image
                src="/logo.png"
                alt="HouseFlow"
                width={80}
                height={80}
                className="rounded-2xl"
                priority
              />
            </div>

            {/* White form card */}
            <div className="bg-white px-6 py-6">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">HouseFlow</h1>
              <p className="text-center text-sm text-gray-500 mb-6">Sign in to your household</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                {err && <p className="text-sm text-red-600 -mt-1">{err}</p>}

                <button
                  disabled={loading}
                  className={`w-full rounded-xl py-2.5 font-medium text-white shadow-sm transition
                    ${loading ? 'bg-gray-400' : 'bg-fuchsia-600 hover:bg-fuchsia-700'}`}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-sm text-center mt-4 text-gray-700">
                No account?{' '}
                <a className="underline text-fuchsia-700 hover:text-fuchsia-800" href="/register">
                  Register
                </a>
              </p>
            </div>
          </div>

          {/* Footer subtle note */}
          <div className="text-center text-xs text-white/80 mt-4">
            By signing in you agree to the household rules.
          </div>
        </div>
      </main>
    </>
  );
}

```

### src/pages/register.tsx
```ts
// src/pages/register.tsx
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? 'Failed to register');
        return;
      }
      setOk(true);
      setTimeout(() => router.push('/'), 800);
    } catch (e: any) {
      setErr(e?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create account – HouseFlow</title></Head>

      <main className="min-h-screen bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Combined card with glass logo header (same width as form) */}
          <div className="overflow-hidden rounded-3xl shadow-xl">
            {/* Glass logo header */}
            <div className="bg-white/10 backdrop-blur-md border-b border-white/20 flex justify-center py-6">
              <Image
                src="/logo.png"
                alt="HouseFlow"
                width={80}
                height={80}
                className="rounded-2xl"
                priority
              />
            </div>

            {/* White form card */}
            <div className="bg-white px-6 py-6">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">Create your account</h1>
              <p className="text-center text-sm text-gray-500 mb-6">Join HouseFlow and start your household</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {err && <p className="text-sm text-red-600 -mt-1">{err}</p>}
                {ok && <p className="text-sm text-emerald-700 -mt-1">Account created. Redirecting…</p>}

                <button
                  disabled={loading}
                  className={`w-full rounded-xl py-2.5 font-medium text-white shadow-sm transition
                    ${loading ? 'bg-gray-400' : 'bg-fuchsia-600 hover:bg-fuchsia-700'}`}
                >
                  {loading ? 'Creating…' : 'Create account'}
                </button>
              </form>

              <p className="text-sm text-center mt-4 text-gray-700">
                Already have an account?{' '}
                <a className="underline text-fuchsia-700 hover:text-fuchsia-800" href="/">
                  Sign in
                </a>
              </p>
            </div>
          </div>

          {/* Footer subtle note */}
          <div className="text-center text-xs text-white/80 mt-4">
            By creating an account you agree to the household rules.
          </div>
        </div>
      </main>
    </>
  );
}

```

### src/pages/settings.tsx
```ts
// src/pages/settings.tsx
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import InvitePanel from '@/components/InvitePanel';

type InviteItem = {
  id: string;
  householdId: string;
  email?: string | null;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
};

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const [householdId, setHouseholdId] = useState<string>('');
  const [loadingHid, setLoadingHid] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (status !== 'authenticated') return;

      const qs = new URLSearchParams(window.location.search);
      const hid = qs.get('hid');
      if (hid) {
        if (mounted) setHouseholdId(hid);
        setLoadingHid(false);
        return;
      }

      const sessHid = (session as any)?.user?.activeHouseholdId as string | undefined;
      if (sessHid) {
        if (mounted) setHouseholdId(sessHid);
        setLoadingHid(false);
        return;
      }

      try {
        const r = await fetch('/api/household/create-default', {
          method: 'POST',
          credentials: 'include',
        });
        const ct = r.headers.get('content-type') || '';
        const body = ct.includes('application/json') ? await r.json() : await r.text();
        const newHid = (body as any)?.householdId as string | undefined;
        if (mounted) setHouseholdId(newHid || '');
      } finally {
        if (mounted) setLoadingHid(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [status, session]);

  if (status === 'loading' || loadingHid) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading…</div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className="p-6 text-red-600">Sign in required</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Household Settings – Houseflow</title></Head>

      {/* Gradient header */}
      <section className="mx-4 sm:mx-6 mt-4 rounded-3xl bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white p-6 sm:p-7 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Household Settings</h1>
            <p className="mt-1 text-sm/relaxed text-white/80">Manage members and invites for your household.</p>

            <div className="mt-3 text-xs text-white/80">
              Household: <span className="font-mono">{householdId || '—'}</span>
            </div>

            {/* Logged in as */}
            <div className="mt-1 text-xs text-white/80">
              Logged in as:{' '}
              <span className="font-medium">
                {(session?.user?.name || session?.user?.email) ?? '—'}
              </span>
            </div>

            {/* “Joined” banner (after invite accept redirect adds ?joined=1) */}
            {typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('joined') === '1' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                  You have successfully joined this household 🎉
                </div>
              )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-xl bg-white/15 border border-white/25 px-3 py-1.5 text-xs hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      </section>

      <main className="mx-4 sm:mx-6 my-6 grid gap-6">
        <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Invite a member</h2>
          <p className="text-sm text-gray-600 mb-4">Invite your partner to access the same Finances & Shopping data.</p>
          <InvitePanel />
        </section>

        <PendingInvites householdId={householdId} />
        <Members householdId={householdId} />
      </main>
    </Layout>
  );
}

/* -------------------- Members (owner can remove) -------------------- */

function Members({ householdId }: { householdId: string }) {
  const [items, setItems] = useState<Array<{
    id: string;
    role: 'OWNER' | 'MEMBER';
    createdAt: string;
    user: { id: string; name: string | null; email: string; createdAt: string };
  }>>([]);
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'MEMBER' | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/household/members?householdId=${encodeURIComponent(householdId)}`,
        { credentials: 'include' }
      );
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setViewerRole(j.viewerRole || null);
      setItems(j.members || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (householdId) void load();
  }, [householdId]);

  async function onRemove(memberId: string) {
    if (!confirm('Remove this member from the household?')) return;
    const r = await fetch(`/api/household/members/${memberId}/remove`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) {
      const msg = await r.text();
      alert(`Remove failed: ${msg || r.status}`);
      return;
    }
    setItems(prev => prev.filter(m => m.id !== memberId)); // optimistic UI
  }

  return (
    <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Members</h2>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No members yet.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-900 truncate">
                  {m.user.name || m.user.email}
                </div>
                <div className="text-xs text-gray-600">
                  Role: {m.role.toLowerCase()} • Joined: {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>

              {viewerRole === 'OWNER' && m.role !== 'OWNER' && (
                <button
                  onClick={() => onRemove(m.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                  title="Remove this member from the household"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <button
          className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          onClick={load}
        >
          Refresh
        </button>
      </div>
    </section>
  );
}

/* -------------------- Pending Invites -------------------- */

function PendingInvites({ householdId }: { householdId: string }) {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/household/invites?householdId=${encodeURIComponent(householdId)}`,
        { credentials: 'include' }
      );
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) throw new Error(typeof data === 'string' ? data : data?.error || 'Failed to load invites');
      setInvites((data as any).invites || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (householdId) load();
  }, [householdId]);

  async function onResend(id: string) {
    const r = await fetch(`/api/household/invites/${id}/resend`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) alert(`Resend failed: ${await r.text()}`); else alert('Resent ✅');
  }

  async function onRevoke(id: string) {
    if (!confirm('Revoke this invite?')) return;
    const r = await fetch(`/api/household/invites/${id}/revoke`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) alert(`Revoke failed: ${await r.text()}`);
    else setInvites(prev => prev.filter(v => v.id !== id));
  }

  return (
    <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Pending invites</h2>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : invites.length === 0 ? (
        <div className="text-sm text-gray-500">No pending invites.</div>
      ) : (
        <ul className="space-y-3">
          {invites.map(inv => (
            <li
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-900 truncate">
                  {inv.email || <span className="italic text-gray-600">Link-only invite</span>}
                </div>
                <div className="text-xs text-gray-600">
                  Role: {inv.role.toLowerCase()} • Expires:&nbsp;{new Date(inv.expiresAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inv.email && (
                  <button
                    onClick={() => onResend(inv.id)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Resend
                  </button>
                )}
                <button
                  onClick={() => onRevoke(inv.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <button
          className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          onClick={load}
        >
          Refresh
        </button>
      </div>
    </section>
  );
}

```

### src/pages/shopping.tsx
```ts
import Head from 'next/head';
import Layout from '../components/Layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useHouseholdId } from '@/lib/useHouseholdId';
import useSWR from 'swr';
import ListPicker from '@/components/ListPicker';

type Item = {
  id: string;
  title: string;
  qty?: string;
  notes?: string;
  status: 'ACTIVE' | 'DONE';
  createdAt?: string;
  updatedAt?: string;
  doneAt?: string;
  createdBy?: { id: string; name: string | null; email: string };
  doneBy?: { id: string; name: string | null; email: string } | null;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => r.json());

const suggestFetcher = (u: string) =>
  fetch(u, { credentials: 'include' }).then((r) => r.json());

// POST fetcher for estimates (titles -> { priceCents, name, url })
const estimateFetcher = async (_key: string, titlesKey: string) => {
  const titles = titlesKey.split('||');
  const res = await fetch('/api/prices/estimate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ titles }),
  });
  if (!res.ok) throw new Error('estimate failed');
  return res.json() as Promise<{
    results: Record<string, { priceCents: number | null; name: string | null; url: string | null }>;
  }>;
};

const newId = () => Math.random().toString(36).slice(2, 10);

// Suggest result type (support both {items} and {results})
type SuggestEntry = {
  id: string;
  title: string;
  store: string;
  price: string | null;
  nowCents?: number | null;
  wasCents?: number | null;
  unit?: string | null;
  imageUrl?: string;
  url: string;
};

export default function ShoppingPage() {
  const { status } = useSession();
  const { householdId, loading: hidLoading, error: hidError } = useHouseholdId();

  if (status === 'loading' || hidLoading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      </Layout>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className="p-6 text-red-600">Sign in required</div>
      </Layout>
    );
  }
  if (!householdId) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
          Creating or locating your household…
        </div>
      </Layout>
    );
  }

  return <ShoppingCore householdId={householdId} hidError={hidError} />;
}

function ShoppingCore({
  householdId,
  hidError,
}: {
  householdId: string;
  hidError?: string | null;
}) {
  const [listId, setListId] = useState<string | null>(null);

  const {
    data: listsData,
    isLoading: listsLoading,
  } = useSWR('/api/shopping/lists', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!listId && listsData?.lists?.length) {
      const firstActive = listsData.lists.find((l: any) => !l.archivedAt);
      setListId((firstActive ?? listsData.lists[0]).id);
    }
  }, [listsData, listId]);

  const {
    data,
    isLoading: itemsLoading,
    isValidating,
    mutate,
  } = useSWR(
    listId ? `/api/shopping/items?listId=${encodeURIComponent(listId)}` : null,
    fetcher,
    {
      refreshInterval: 4000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const items: Item[] = (data?.items ?? []) as Item[];

  const [t, setT] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [sort, setSort] = useState<'new' | 'alpha'>('new');

  // --- Local overlays for instant price + image (keyed by title) ---
  const [localPriceByTitle, setLocalPriceByTitle] = useState<
    Record<string, { priceCents: number; url: string | null; name: string | null }>
  >({});
  const [imageByTitle, setImageByTitle] = useState<Record<string, string>>({});

  // --- Selected suggestion to carry into Add ---
  const [picked, setPicked] = useState<{
    productId: string;
    title: string; // used as name for tooltip
    nowCents?: number | null;
    url?: string | null;
    imageUrl?: string | null;
  } | null>(null);

  // autocomplete state
  const [showSug, setShowSug] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(t.trim()), 200);
    return () => clearTimeout(id);
  }, [t]);

  const { data: suggestData } = useSWR(
    debouncedQ.length >= 2
      ? `/api/prices/suggest?q=${encodeURIComponent(debouncedQ)}`
      : null,
    suggestFetcher,
    { keepPreviousData: true }
  );

  // Support both {items} and {results} payload shapes
  const suggestions: SuggestEntry[] = useMemo(() => {
    const raw = suggestData?.items ?? suggestData?.results ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [suggestData]);

  // ===== price estimates for current list =====
  const titlesForEstimate = useMemo(() => {
    const unique = Array.from(
      new Set(items.map((i) => (i.title || '').trim()).filter(Boolean))
    );
    return unique;
  }, [items]);

  const estimateKey =
    titlesForEstimate.length > 0 ? ['estimate', titlesForEstimate.join('||')] : null;

  const { data: estimateData } = useSWR(
    estimateKey as any,
    estimateKey ? estimateFetcher : null,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const priceMapFromEstimator: Record<
    string,
    { priceCents: number | null; name: string | null; url: string | null }
  > = useMemo(() => estimateData?.results ?? {}, [estimateData]);

  // --- Effective price map includes name for tooltip ---
  const effectivePriceByTitle: Record<
    string,
    { priceCents: number | null; url: string | null; name: string | null }
  > = useMemo(() => {
    const merged: Record<
      string,
      { priceCents: number | null; url: string | null; name: string | null }
    > = { ...priceMapFromEstimator };
    for (const [title, v] of Object.entries(localPriceByTitle)) {
      merged[title] = {
        priceCents: v.priceCents,
        url: v.url ?? merged[title]?.url ?? null,
        name: v.name ?? merged[title]?.name ?? null,
      };
    }
    return merged;
  }, [priceMapFromEstimator, localPriceByTitle]);

  // helpers
  const displayName = (u?: { name: string | null; email: string } | null) =>
    u?.name?.trim() || u?.email || 'Someone';
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

  const parseQty = (raw?: string) => {
    if (!raw) return 1;
    const s = raw.trim();
    const m = s.match(/^(\d+(?:[.,]\d+)?)/);
    if (!m) return 1;
    const n = Number(m[1].replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const formatEuro = (cents?: number | null) =>
    cents != null ? `€${(cents / 100).toFixed(2)}` : '';

  const visible = useMemo(() => {
    let list = [...items];
    if (filter === 'active') list = list.filter((i) => i.status !== 'DONE');
    if (filter === 'done') list = list.filter((i) => i.status === 'DONE');
    if (sort === 'alpha')
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else
      list.sort((a, b) =>
        (b.updatedAt || b.createdAt || '').localeCompare(
          a.updatedAt || a.createdAt || ''
        )
      );
    return list;
  }, [items, filter, sort]);

  const loading = listsLoading || itemsLoading;

  // compute total for visible items (only those with a price)
  const totalCents = useMemo(() => {
    return visible.reduce((sum, it) => {
      const key = (it.title || '').trim();
      const est = effectivePriceByTitle[key];
      const unitPrice = est?.priceCents ?? null;
      if (!unitPrice) return sum;
      const qty = parseQty(it.qty);
      return sum + Math.round(unitPrice * qty);
    }, 0);
  }, [visible, effectivePriceByTitle]);

  async function addItem(title: string, qty?: string) {
    if (!listId) return;

    const pickedForTitle =
      picked && picked.title.toLowerCase().trim() === title.toLowerCase().trim()
        ? picked
        : null;

    const optimistic: Item = {
      id: `temp_${newId()}`,
      title: title.trim(),
      qty: qty?.trim() || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: 'me', name: 'You', email: '' },
    };

    // Optimistic UI insert
    mutate({ items: [optimistic, ...(data?.items || [])] }, { revalidate: false });

    // Overlay local price & image immediately (no flicker)
    if (pickedForTitle?.nowCents) {
      setLocalPriceByTitle((p) => ({
        ...p,
        [optimistic.title]: {
          priceCents: pickedForTitle.nowCents!,
          url: pickedForTitle.url ?? null,
          name: pickedForTitle.title ?? null,
        },
      }));
    }
    if (pickedForTitle?.imageUrl) {
      setImageByTitle((prev) => ({ ...prev, [optimistic.title]: pickedForTitle.imageUrl! }));
    }

    // POST to server with non-persistent hints (server may ignore)
    await fetch('/api/shopping/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        listId,
        title,
        qty,
        priceProductId: pickedForTitle?.productId,
        priceCents: pickedForTitle?.nowCents,
        imageUrl: pickedForTitle?.imageUrl,
        url: pickedForTitle?.url,
      }),
    });

    // Revalidate to get real id; estimator SWR keeps running in background
    mutate();

    // Clear input & picked state
    setT('');
    setQ('');
    setPicked(null);
  }

  async function toggle(id: string, done: boolean) {
    await fetch(`/api/shopping/items/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: done ? 'DONE' : 'ACTIVE' }),
    });
    mutate();
  }

  async function remove(id: string) {
    await fetch(`/api/shopping/items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    mutate();
  }

  async function update(id: string, patch: Partial<Item>) {
    await fetch(`/api/shopping/items/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    mutate();
  }

  async function clearDone() {
    if (!listId) return;
    await fetch(`/api/shopping/items/clear-done`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ listId }),
    });
    mutate();
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    const title = t.trim();
    if (!title || !listId) return;
    addItem(title, q);
  }

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Layout>
      <Head>
        <title>Shopping – Houseflow</title>
      </Head>

      {/* header */}
      <section className="px-4 sm:px-6 mt-4">
        <div className="max-w-screen-md mx-auto rounded-3xl bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white p-4 sm:p-7 shadow">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-semibold">Household Shopping</h1>
              <p className="mt-1 text-xs sm:text-sm text-white/80">
                Shared list for this household.
              </p>
              <div className="mt-2 text-[10px] sm:text-xs text-white/80 break-all">
                Household:&nbsp;<span className="font-mono">{householdId}</span>
              </div>
              {hidError && <div className="mt-2 text-xs text-rose-100">{hidError}</div>}
              <div className="mt-2 text-[10px] sm:text-[11px]">
                {loading ? 'Loading…' : isValidating ? 'Syncing…' : 'Up to date'}
              </div>
            </div>
            <button
              onClick={() => mutate()}
              className="rounded-xl border border-white/40 bg-white/15 px-3 py-1.5 text-xs hover:bg-white/20"
              title="Refresh from server"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 my-6">
        <div className="max-w-screen-md mx-auto grid gap-4 sm:gap-6">
          {/* list picker */}
          <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 text-gray-900">List</h2>
            <ListPicker selectedId={listId} onChange={(id) => setListId(id)} />
          </section>

          {/* quick add with autocomplete */}
          <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 text-gray-900">Add item</h2>
            <form
              onSubmit={submitQuick}
              className="grid gap-2 sm:gap-3 sm:grid-cols-[1fr_180px_auto]"
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  value={t}
                  onChange={(e) => {
                    setT(e.target.value);
                    setShowSug(true);
                    setPicked(null); // typing cancels previous pick
                  }}
                  onFocus={() => setShowSug(true)}
                  onBlur={() => setTimeout(() => setShowSug(false), 120)}
                  placeholder="What do we need?"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                  autoComplete="off"
                />
                {showSug && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-72 overflow-auto">
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={s.id + s.url}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                        onClick={() => {
                          setT(s.title);
                          if (s.unit && !q) setQ(s.unit);
                          setPicked({
                            productId: s.id,
                            title: s.title,
                            nowCents: s.nowCents ?? null,
                            url: s.url ?? null,
                            imageUrl: s.imageUrl ?? null,
                          });
                          setShowSug(false);
                          inputRef.current?.focus();
                        }}
                      >
                        {s.imageUrl ? (
                          <img
                            src={s.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded object-contain bg-white"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 truncate">
                            {s.title}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {s.store}
                            {s.price ? ` • ${s.price}` : ''}
                            {s.unit ? ` • ${s.unit}` : ''}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Qty / size (optional)"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
              />
              <button
                type="submit"
                disabled={!listId}
                className="rounded-xl bg-fuchsia-600 text-white px-4 py-2 text-sm font-medium shadow-sm min-h-[44px] hover:bg-fuchsia-700 disabled:opacity-60"
              >
                Add
              </button>
            </form>
          </section>

          {/* controls */}
          <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm">Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="done">Purchased</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm">Sort</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-h-[40px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                >
                  <option value="new">Newest first</option>
                  <option value="alpha">A → Z</option>
                </select>
              </div>

              <div className="flex gap-2 sm:justify-end">
                <button
                  onClick={clearDone}
                  disabled={!listId}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm min-h-[40px] hover:bg-gray-50 disabled:opacity-60"
                >
                  Clear purchased
                </button>
                <button
                  onClick={() => mutate()}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm min-h-[40px] hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {/* list */}
          <section className="rounded-3xl bg-white shadow-sm border border-black/5 p-1 sm:p-3">
            {visible.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                {listId
                  ? 'Nothing here yet — add your first item above.'
                  : 'Create or pick a list above to get started.'}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200">
                  {visible.map((item) => {
                    const key = (item.title || '').trim();
                    const est = effectivePriceByTitle[key];
                    const unitPrice = est?.priceCents ?? null;
                    const qtyNum = parseQty(item.qty);
                    const lineTotal = unitPrice ? unitPrice * qtyNum : null;
                    const thumb = imageByTitle[key];

                    return (
                      <li key={item.id} className="p-3 sm:p-4 flex items-start gap-3">
                        {/* thumb (if we have one) */}
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200" />
                        )}

                        <button
                          onClick={() => toggle(item.id, item.status !== 'DONE')}
                          className={`mt-0.5 h-6 w-6 rounded border flex items-center justify-center ${
                            item.status === 'DONE'
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'bg-white border-gray-300'
                          }`}
                          title={
                            item.status === 'DONE'
                              ? 'Mark as not purchased'
                              : 'Mark as purchased'
                          }
                        >
                          {item.status === 'DONE' ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.535a1 1 0 111.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : null}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <input
                              value={item.title}
                              onChange={(e) => {
                                const newTitle = e.target.value;
                                // overlays are keyed by title; we won't migrate them on rename
                                update(item.id, { title: newTitle });
                              }}
                              className={`w-full border-0 bg-transparent p-0 text-base sm:text-lg focus:outline-none ${
                                item.status === 'DONE'
                                  ? 'line-through text-gray-400'
                                  : 'text-gray-900'
                              }`}
                            />

                            {/* price pill with name tooltip */}
                            {unitPrice != null && (
                              <div
                                className="shrink-0 rounded-full bg-fuchsia-50 text-fuchsia-700 px-2 py-1 text-[11px] border border-fuchsia-200"
                                title={est?.name || est?.url || ''}
                              >
                                {formatEuro(unitPrice)}
                                {qtyNum > 1 ? ` × ${qtyNum}` : ''}
                                {lineTotal && qtyNum > 1 ? ` = ${formatEuro(lineTotal)}` : ''}
                              </div>
                            )}
                          </div>

                          <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            <input
                              value={item.qty || ''}
                              onChange={(e) => update(item.id, { qty: e.target.value })}
                              placeholder="Qty"
                              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs sm:text-sm min-h-[38px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                            />
                            <input
                              value={item.notes || ''}
                              onChange={(e) => update(item.id, { notes: e.target.value })}
                              placeholder="Notes"
                              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs sm:text-sm min-h-[38px] focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 sm:flex-1"
                            />
                          </div>

                          <div className="mt-1 text-[11px] text-gray-500 space-x-1">
                            <span>
                              Added by {displayName(item.createdBy)}
                              {item.createdAt ? ` on ${when(item.createdAt)}` : ''}
                            </span>
                            {item.status === 'DONE' && (
                              <>
                                <span>•</span>
                                <span>
                                  Done by {displayName(item.doneBy)}
                                  {item.doneAt ? ` at ${when(item.doneAt)}` : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => remove(item.id)}
                          className="self-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 text-red-600 min-h-[38px]"
                        >
                          remove
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* footer total */}
                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {visible.length} item{visible.length === 1 ? '' : 's'}
                  </div>
                  <div className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white px-4 py-2 text-sm font-semibold shadow">
                    Total {formatEuro(totalCents)}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}

```

### src/pages/api/page-state.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUserId(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function requireMembership(userId: string, householdId: string) {
  return prisma.membership.findFirst({
    where: { userId, householdId },
    select: { id: true, role: true },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const householdId = (req.query.householdId as string) || (req.body?.householdId as string) || '';
  const page = (req.query.page as string) || (req.body?.page as string) || '';
  if (!householdId || !page) return res.status(400).json({ error: 'householdId and page are required' });

  const membership = await requireMembership(userId, householdId);
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member of this household' });

  if (method === 'GET') {
    const ps = await prisma.pageState.findUnique({ where: { householdId_page: { householdId, page } } });
    return res.status(200).json({ data: ps?.data ?? null, updatedAt: ps?.updatedAt ?? null });
  }

  if (method === 'POST' || method === 'PUT') {
    // Accept any JSON payload in `data`
    const data = req.body?.data;
    if (data === undefined) return res.status(400).json({ error: 'data is required' });

    const saved = await prisma.pageState.upsert({
      where: { householdId_page: { householdId, page } },
      update: { data, updatedBy: userId },
      create: { householdId, page, data, updatedBy: userId },
      select: { data: true, updatedAt: true },
    });
    return res.status(200).json(saved);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/register.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { name, email, password } = req.body ?? {};

    const _email = (email ?? '').toString().trim().toLowerCase();
    const _password = (password ?? '').toString();

    if (!_email || !_password) return res.status(400).json({ ok: false, error: 'Email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email)) return res.status(400).json({ ok: false, error: 'Invalid email' });
    if (_password.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });

    const exists = await prisma.user.findUnique({ where: { email: _email } });
    if (exists) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const hash = await bcrypt.hash(_password, 10);

    const user = await prisma.user.create({
      data: { name: name?.toString() || null, email: _email, password: hash },
      select: { id: true, email: true, name: true },
    });

    return res.status(201).json({ ok: true, user });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

```

### src/pages/api/state.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
// Use a RELATIVE import to avoid TS path alias issues:
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const householdId = String(req.query.householdId || '').trim();
  const page        = String(req.query.page || '').trim();

  if (!householdId) return res.status(400).json({ ok: false, error: 'householdId required' });
  if (!page)        return res.status(400).json({ ok: false, error: 'page required' });

  try {
    if (req.method === 'GET') {
      const row = await prisma.pageState.findUnique({
        where: { householdId_page: { householdId, page } },
      });
      return res.status(200).json({ ok: true, data: row?.data ?? null, updatedAt: row?.updatedAt ?? null });
    }

    if (req.method === 'PUT') {
      const { data, updatedBy } = req.body as { data: any; updatedBy?: string | null };
      if (!data || typeof data !== 'object') return res.status(400).json({ ok: false, error: 'data object required' });

      const saved = await prisma.pageState.upsert({
        where: { householdId_page: { householdId, page } },
        update: { data, updatedBy: updatedBy ?? null },
        create: { householdId, page, data, updatedBy: updatedBy ?? null },
      });
      return res.status(200).json({ ok: true, updatedAt: saved.updatedAt });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

```

### src/pages/invites/accept.tsx
```ts
// src/pages/invites/accept.tsx
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

type Props = { error?: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const token = (ctx.query.token as string | undefined)?.trim() || '';
  if (!token) return { props: { error: 'Missing token' } };

  // 1) Find invite & validate
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: { id: true, status: true, role: true, expiresAt: true, householdId: true },
  });
  if (!invite) return { props: { error: 'Invite not found' } };
  if (invite.status !== 'PENDING') return { props: { error: 'Invite already used or not pending' } };
  if (invite.expiresAt <= new Date()) return { props: { error: 'Invite expired' } };

  // 2) Require login
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as any;
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    const next = `/invites/accept?token=${encodeURIComponent(token)}`;
    return { redirect: { destination: `/?signin=1&next=${encodeURIComponent(next)}`, permanent: false } };
  }

  // 3) Ensure membership exists
  const existing = await prisma.membership.findFirst({
    where: { userId, householdId: invite.householdId },
    select: { id: true },
  });
  if (!existing) {
    await prisma.membership.create({
      data: { userId, householdId: invite.householdId, role: invite.role },
    });
  }

  // 4) Mark invite accepted (so it disappears from "Pending invites")
  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: userId },
  });

  // 5) Redirect to Settings with success banner
  return {
    redirect: {
      destination: `/settings?hid=${encodeURIComponent(invite.householdId)}&joined=1`,
      permanent: false,
    },
  };
};

export default function AcceptInvitePage({ error }: Props) {
  return (
    <>
      <Head><title>Invite – Houseflow</title></Head>
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Invite</h1>
          {error ? (
            <>
              <p className="text-sm text-gray-700 mb-3">{error}</p>
              <Link href="/settings" className="text-sm text-fuchsia-600 underline">Go to Settings</Link>
            </>
          ) : (
            <p className="text-sm text-gray-600">Completing…</p>
          )}
        </div>
      </main>
    </>
  );
}

```

### src/pages/api/auth/[...nextauth].ts
```ts
import type { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/', // our login page
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? '').toString().trim();
        const password = (credentials?.password ?? '').toString();

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Return a minimal object—id & email are enough; name optional
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
      async jwt({ token, user }) {
    if (user) { token.id = (user as any).id; token.email = user.email; token.name = user.name; }
    // Load activeHouseholdId on login
    if (token?.id) {
      const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { activeHouseholdId: true } });
      (token as any).activeHouseholdId = u?.activeHouseholdId ?? null;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user && token) {
      (session.user as any).id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = (token.name as string) ?? session.user.email ?? '';
      // expose active
      (session.user as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
    }
    return session;
    },
  },
};

export default NextAuth(authOptions);

```

### src/pages/api/debug/resend-test.ts
```ts
// src/pages/api/debug/resend-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendInviteEmail } from '@/lib/resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const to = (req.query.to as string) || process.env.TEST_EMAIL || '';
  if (!to) return res.status(400).send('Provide ?to=email@example.com or set TEST_EMAIL');
  const acceptUrl = (req.query.url as string) || 'https://galeahub.online/invite/accept?token=debug';
  const result = await sendInviteEmail({
    to,
    acceptUrl,
    householdName: 'Debug Household',
    invitedByName: 'Houseflow',
  });
  return res.status(result.ok ? 200 : 500).json(result);
}

```

### src/pages/api/household/active.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // 1) If user has a stored active household, use it if membership still valid
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeHouseholdId: true },
    });

    if (u?.activeHouseholdId) {
      const valid = await prisma.membership.findFirst({
        where: { userId, householdId: u.activeHouseholdId },
        select: { id: true },
      });
      if (valid) return res.status(200).json({ householdId: u.activeHouseholdId });
    }

    // 2) Fallback: use most-recent membership (global default)
    const latest = await prisma.membership.findFirst({
      where: { userId },
      select: { householdId: true },
      orderBy: { createdAt: 'desc' }, // latest joined
    });
    if (!latest) return res.status(404).json({ error: 'No household' });

    // Persist fallback to user for next time (global)
    await prisma.user.update({
      where: { id: userId },
      data: { activeHouseholdId: latest.householdId },
    });

    return res.status(200).json({ householdId: latest.householdId });
  }

  if (req.method === 'POST') {
    const householdId = (req.body?.householdId as string | undefined) || '';
    if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

    const m = await prisma.membership.findFirst({
      where: { userId, householdId },
      select: { id: true },
    });
    if (!m) return res.status(403).json({ error: 'Forbidden: not a member' });

    await prisma.user.update({
      where: { id: userId },
      data: { activeHouseholdId: householdId },
    });

    return res.status(200).json({ ok: true, householdId });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/household/create-default.ts
```ts
// src/pages/api/household/create-default.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1) Ensure signed in
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sessionId = sess?.user?.id as string | undefined;
  const sessionEmail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sessionId && !sessionEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2) Resolve the *actual* user row (id first, then email fallback)
  //    Include activeHouseholdId so we can set a fallback if needed.
  let user = null as null | { id: string; name: string | null; email: string; activeHouseholdId: string | null };
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }
  if (!user && sessionEmail) {
    user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, name: true, email: true, activeHouseholdId: true },
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'User not found for session. Please sign out and sign in again.' });
  }

  // 3) If user already belongs to any household, reuse the earliest one
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { householdId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    // If they don't have an active household set yet, set this one as active.
    if (!user.activeHouseholdId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeHouseholdId: existing.householdId },
      });
    }
    return res.status(200).json({ householdId: existing.householdId });
  }

  // 4) Otherwise create a personal household + OWNER membership (transaction)
  const defaultName =
    (user.name?.split(' ')[0] || user.email.split('@')[0] || 'My') + "'s Household";

  try {
    const household = await prisma.$transaction(async (tx) => {
      const h = await tx.household.create({
        data: { name: defaultName, ownerId: user!.id },
        select: { id: true },
      });

      await tx.membership.create({
        data: { userId: user!.id, householdId: h.id, role: 'OWNER' },
      });

      // NEW: set this newly created household as the user's active household
      await tx.user.update({
        where: { id: user!.id },
        data: { activeHouseholdId: h.id },
      });

      return h;
    });

    return res.status(200).json({ householdId: household.id });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to create default household', detail: e?.message || String(e) });
  }
}

```

### src/pages/api/invites/accept.ts
```ts
// src/pages/api/invites/accept.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { InviteStatus, MemberRole } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const token = (req.query.token as string | undefined)?.trim();
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = session?.user?.id as string | undefined;
  const semail = (session?.user?.email as string | undefined)?.toLowerCase();
  if (!sid && !semail) return res.status(401).json({ error: 'Sign in required' });

  // Resolve real DB user id
  let userId: string | null = null;
  if (sid) {
    const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } });
    if (u) userId = u.id;
  }
  if (!userId && semail) {
    const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } });
    if (u) userId = u.id;
  }
  if (!userId) {
    return res
      .status(401)
      .json({ error: 'User for session not found. Please sign out and sign in again.' });
  }

  const invite = await prisma.invite.findFirst({
    where: { token },
    select: { id: true, householdId: true, role: true, status: true, expiresAt: true },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.status !== ('PENDING' as InviteStatus)) {
    return res.status(400).json({ error: 'Invite is not pending' });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Invite has expired' });
  }

  const existing = await prisma.membership.findFirst({
    where: { userId, householdId: invite.householdId },
    select: { id: true },
  });
  if (!existing) {
    await prisma.membership.create({
      data: { userId, householdId: invite.householdId, role: ('MEMBER' as MemberRole) },
    });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: ('ACCEPTED' as InviteStatus), acceptedById: userId, acceptedAt: new Date() },
  });

  return res.status(200).json({ ok: true, householdId: invite.householdId });
}

```

### src/pages/api/prices/estimate.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * Aggressive normalization and fuzzy ranking to estimate a price for a free-typed title.
 *
 * Response:
 * {
 *   results: Record<string, { priceCents: number; name: string; url: string }>
 * }
 *
 * No auth requirement (public).
 */

// --- Normalization utilities ---

// Split digit<->letter boundaries and letter<->digit boundaries, split "6x1.5lt" → "6 x 1 5 l t"
// Fix glued words like "regularsoft" → "regular soft", "softdrink" → "soft drink"
function aggressiveNormalize(input: string): string {
  let s = input.toLowerCase();

  // Replace separators with space
  s = s.replace(/[_\-\/,;:+]+/g, ' ');

  // Break letter<->digit and digit<->letter boundaries
  s = s.replace(/([a-z])(\d)/g, '$1 $2');
  s = s.replace(/(\d)([a-z])/g, '$1 $2');

  // Break "x" multiplier variants (e.g., 6x1.5l, 2X500ml)
  s = s.replace(/(\d)\s*[x×]\s*(\d)/gi, '$1 x $2');

  // Split decimal points into separate tokens ("1.5" -> "1 5")
  s = s.replace(/(\d)\.(\d)/g, '$1 $2');

  // Common glued terms to split
  const gluedFixes: Array<[RegExp, string]> = [
    [/softdrink/g, 'soft drink'],
    [/softdrinks/g, 'soft drinks'],
    [/regularsoft/g, 'regular soft'],
    [/tomatosauce/g, 'tomato sauce'],
    [/passatasauce/g, 'passata sauce'],
    [/cocacola/g, 'coca cola'],
    [/dietcoke/g, 'diet coke'],
    [/pepsimax/g, 'pepsi max'],
    [/lt\b/g, 'l'], // lt → l
    [/lts\b/g, 'l'],
    [/gr\b/g, 'g'],
  ];
  for (const [re, rep] of gluedFixes) s = s.replace(re, rep);

  // Strip punctuation except spaces
  s = s.replace(/[()"'`.!?]|&/g, ' ');

  // Collapse extra whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

function tokensOf(s: string): string[] {
  return aggressiveNormalize(s).split(/\s+/).filter(Boolean);
}

function tokenOverlapScore(aTokens: string[], bTokens: string[]): number {
  const aSet = new Set(aTokens);
  let overlap = 0;
  for (const t of bTokens) if (aSet.has(t)) overlap += 1;
  // Normalize by smaller length to avoid bias
  const denom = Math.max(1, Math.min(aTokens.length, bTokens.length));
  return overlap / denom;
}

// Longest Common Substring length (not subsequence)
function lcsLength(a: string, b: string): number {
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best) best = dp[i][j];
      }
    }
  }
  return best;
}

function similarityScore(a: string, b: string): number {
  const lcs = lcsLength(a, b);
  const denom = Math.max(a.length, b.length) || 1;
  return lcs / denom; // 0..1
}

function buildOrWhere(tokens: string[]) {
  return tokens.map((t) => ({ nameNormalized: { contains: t } }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Public endpoint: do not enforce auth here
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const qInput =
    req.method === 'GET'
      ? (req.query.q ?? '').toString()
      : typeof req.body?.q === 'string'
      ? req.body.q
      : '';

  const titles: string[] =
    req.method === 'GET'
      ? [qInput].filter(Boolean)
      : Array.isArray(req.body?.titles)
      ? (req.body.titles as string[]).filter((s) => typeof s === 'string' && s.trim())
      : qInput
      ? [qInput]
      : [];

  if (!titles.length) {
    return res.status(200).json({ results: {} });
  }

  const results: Record<string, { priceCents: number; name: string; url: string }> = {};

  try {
    for (const title of titles) {
      const norm = aggressiveNormalize(title);
      const tokens = tokensOf(title).slice(0, 8);

      // Fallback token set: first two tokens and any numeric tokens to capture sizes like "1 5 l"
      const numericTokens = tokens.filter((t) => /^\d+(\.\d+)?$/.test(t));
      const firstTwo = tokens.slice(0, 2);
      const orTokens = Array.from(new Set([...tokens, ...firstTwo, ...numericTokens])).slice(
        0,
        10
      );

      // Pull up to 80 candidates with token-OR, Smart domain preferred
      const candidates = await prisma.priceProduct.findMany({
        where: {
          sourceUrl: { contains: 'smart.com.mt' },
          OR: orTokens.length ? buildOrWhere(orTokens) : undefined,
        },
        select: {
          id: true,
          name: true,
          nameNormalized: true,
          sourceUrl: true,
          offers: {
            orderBy: { scrapedAt: 'desc' },
            take: 1,
            select: { priceCents: true, scrapedAt: true },
          },
        },
        take: 80,
      });

      // Ranking
      const aTokens = tokensOf(norm);
      const aStr = aggressiveNormalize(norm);

      const ranked = candidates
        .map((p) => {
          const bStr = aggressiveNormalize(p.nameNormalized || p.name);
          const bTokens = tokensOf(bStr);
          const overlap = tokenOverlapScore(aTokens, bTokens);
          const sim = similarityScore(aStr, bStr);
          // Weight overlap a bit more; add tiny recency preference (no timestamp if no offers)
          const latest = p.offers[0];
          const recencyBoost = latest ? Math.min(0.1, 1 / (1 + (Date.now() - new Date(latest.scrapedAt).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;
          const score = overlap * 0.7 + sim * 0.3 + recencyBoost;

          return {
            product: p,
            latest,
            score,
            overlap,
            sim,
          };
        })
        .filter((r) => r.latest) // require a known price
        .sort((a, b) => b.score - a.score);

      // Acceptance: any overlap or decent similarity; otherwise fallback strategies
      let winner = ranked.find((r) => r.overlap > 0 || r.sim >= 0.25);

      if (!winner) {
        // Fallback 1: nameNormalized contains normalized query
        const contains = candidates
          .filter((p) => p.offers[0])
          .filter((p) => {
            const n = (p.nameNormalized || p.name).toLowerCase();
            return n.includes(aStr);
          })
          .sort((a, b) => (a.offers[0] && b.offers[0]
            ? new Date(b.offers[0]!.scrapedAt).getTime() - new Date(a.offers[0]!.scrapedAt).getTime()
            : 0));
        if (contains[0]) {
          winner = {
            product: contains[0],
            latest: contains[0].offers[0],
            score: 0.01,
            overlap: 0,
            sim: 0,
          };
        }
      }

      if (!winner && firstTwo.length) {
        // Fallback 2: first two tokens AND together
        const firstTwoStr = firstTwo.join(' ');
        const containsTwo = candidates
          .filter((p) => p.offers[0])
          .filter((p) => (p.nameNormalized || p.name).toLowerCase().includes(firstTwoStr));
        if (containsTwo[0]) {
          winner = {
            product: containsTwo[0],
            latest: containsTwo[0].offers[0],
            score: 0.005,
            overlap: 0,
            sim: 0,
          };
        }
      }

      if (winner && winner.latest) {
        results[title] = {
          priceCents: winner.latest.priceCents,
          name: winner.product.name,
          url: winner.product.sourceUrl,
        };
      }
    }

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error('estimate error', err);
    return res.status(200).json({ results: {} });
  }
}

```

### src/pages/api/prices/suggest.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * Response shape:
 * {
 *   items: Array<{
 *     id: string;
 *     title: string;
 *     store: 'Smart Supermarket';
 *     price: string; // e.g., "0.89 EUR" or "0.79 EUR (was 1.09 EUR)"
 *     nowCents: number;
 *     wasCents?: number;
 *     imageUrl: string;
 *     url: string;
 *   }>
 * }
 */

function centsToEUR(cents: number) {
  return (cents / 100).toFixed(2) + ' EUR';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const qRaw = (req.query.q ?? '').toString().trim();
  if (!qRaw) {
    return res.status(200).json({ items: [] });
  }

  // Lightweight normalization for search (not as aggressive as estimator).
  const q = qRaw.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  const tokens = Array.from(new Set(q.split(/\s+/).filter(Boolean))).slice(0, 6);

  // Prefer Smart Supermarket by detecting its domain in product sourceUrl.
  // Also only consider products that have an image.
  // Limit candidates for performance; sort by rough textual proximity.
  const whereOr = tokens.map((t) => ({
    nameNormalized: { contains: t },
  }));

  try {
    const candidates = await prisma.priceProduct.findMany({
      where: {
        imageUrl: { not: null },
        sourceUrl: { contains: 'smart.com.mt' },
        OR: whereOr.length ? whereOr : undefined,
      },
      select: {
        id: true,
        name: true,
        sourceUrl: true,
        imageUrl: true,
        offers: {
          orderBy: { scrapedAt: 'desc' },
          take: 20, // grab a window to compute latest + was within 30d
          select: {
            id: true,
            priceCents: true,
            scrapedAt: true,
            currency: true,
          },
        },
      },
      take: 60, // raw candidate cap
    });

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // Rank: simple token overlap + startsWith bonus
    const score = (name: string) => {
      const n = name.toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (n.includes(t)) s += 1;
        if (n.startsWith(t)) s += 0.5;
      }
      return s;
    };

    const withOffers = candidates
      .map((p) => {
        const latest = p.offers[0];
        if (!latest) return null;

        // Look back 30d for any higher price (was)
        const recent = p.offers.filter(
          (o) => now - new Date(o.scrapedAt).getTime() <= THIRTY_DAYS
        );
        const maxRecent = recent.reduce<number | null>(
          (acc, o) => (acc === null ? o.priceCents : Math.max(acc, o.priceCents)),
          null
        );

        const wasCents =
          maxRecent !== null && maxRecent > latest.priceCents ? maxRecent : undefined;

        const price =
          wasCents !== undefined
            ? `${centsToEUR(latest.priceCents)} (was ${centsToEUR(wasCents)})`
            : centsToEUR(latest.priceCents);

        return {
          id: p.id,
          title: p.name,
          store: 'Smart Supermarket' as const,
          price,
          nowCents: latest.priceCents,
          wasCents,
          imageUrl: p.imageUrl!,
          url: p.sourceUrl,
          _score: score(p.name),
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        title: string;
        store: 'Smart Supermarket';
        price: string;
        nowCents: number;
        wasCents?: number;
        imageUrl: string;
        url: string;
        _score: number;
      }>;

    // Prefer higher score and products with very recent offer first (small tie-breaker)
    withOffers.sort((a, b) => b._score - a._score);

    const items = withOffers.slice(0, 12).map(({ _score, ...rest }) => rest);

    return res.status(200).json({ items });
  } catch (err: any) {
    console.error('suggest error', err);
    return res.status(200).json({ items: [] });
  }
}

```

### src/pages/api/household/members/index.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end('Method Not Allowed'); }
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const householdId = (req.query.householdId as string) || '';
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' });

  // Must be a member to view; owners get role info for everyone
  const viewer = await prisma.membership.findFirst({ where: { userId, householdId }, select: { role: true } });
  if (!viewer) return res.status(403).json({ error: 'Forbidden' });

  const members = await prisma.membership.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  return res.status(200).json({ viewerRole: viewer.role, members });
}

```

### src/pages/api/household/invites/index.ts
```ts
// src/pages/api/household/invites/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { InviteStatus, MemberRole } from '@prisma/client';
import { sendInviteEmail } from '@/lib/mailer';

// --- helpers (resolve user; enforce membership/owner) ---
async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = sess?.user?.id as string | undefined;
  const semail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sid && !semail) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (sid) {
    const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } });
    if (u) return u.id;
  }
  if (semail) {
    const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } });
    if (u) return u.id;
  }

  res.status(401).json({ error: 'User for session not found. Please sign out and sign in again.' });
  return null;
}

async function requireMembershipIn(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  { ownerOnly = false }: { ownerOnly?: boolean } = {}
): Promise<{ userId: string } | null> {
  if (!householdId) {
    res.status(400).json({ error: 'Missing householdId' });
    return null;
  }
  const userId = await resolveUserId(req, res);
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { role: true },
  });
  if (!membership) {
    res.status(403).json({ error: 'Forbidden: not a member of this household' });
    return null;
  }
  if (ownerOnly && membership.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden: owner role required' });
    return null;
  }
  return { userId };
}
// -----------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return listInvites(req, res);
  if (req.method === 'POST') return createInvite(req, res);
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

async function listInvites(req: NextApiRequest, res: NextApiResponse) {
  const householdId = (req.query.householdId as string) || '';
  const ctx = await requireMembershipIn(req, res, householdId, { ownerOnly: false });
  if (!ctx) return;

  const invites = await prisma.invite.findMany({
    where: {
      householdId,
      status: 'PENDING' as InviteStatus,
      // NEW: hide invites that are already expired by time
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
    select: {
      id: true,
      householdId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  return res.status(200).json({ invites });
}

function makeAcceptUrl(req: NextApiRequest, token: string) {
  // Prefer env base to align link domain with sender domain
  const base = (process.env.INVITES_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/invites/accept?token=${encodeURIComponent(token)}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['host'] as string) || 'localhost:3000';
  return `${proto}://${host}/invites/accept?token=${encodeURIComponent(token)}`;
}

async function createInvite(req: NextApiRequest, res: NextApiResponse) {
  const { householdId, email, role } = (req.body || {}) as {
    householdId?: string;
    email?: string | null;
    role?: 'OWNER' | 'MEMBER';
  };

  const ctx = await requireMembershipIn(req, res, householdId, { ownerOnly: true });
  if (!ctx) return;

  if (!role || (role !== 'OWNER' && role !== 'MEMBER')) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const token = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      householdId: householdId!,
      email: email ? String(email).toLowerCase() : null,
      role: role as MemberRole,
      status: 'PENDING' as InviteStatus,
      expiresAt,
      invitedById: ctx.userId,
      token,
    },
    select: {
      id: true,
      token: true,
      householdId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  let emailStatus:
    | { ok: boolean; error?: string; from?: string; to?: string; id?: string }
    | undefined = undefined;

  if (invite.email) {
    const inviter = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    });
    const household = await prisma.household.findUnique({
      where: { id: householdId! },
      select: { name: true },
    });

    const acceptUrl = makeAcceptUrl(req, invite.token);
    const r = await sendInviteEmail({
      to: invite.email,
      acceptUrl,
      inviterName: inviter?.name || inviter?.email || 'A Houseflow user',
      householdName: household?.name || 'your household',
    });

    emailStatus = r.ok
      ? { ok: true, from: r.fromUsed, to: r.to, id: r.providerId }
      : { ok: false, error: r.error, from: r.fromUsed, to: r.to };
  }

  return res.status(200).json({
    id: invite.id,
    acceptUrl: makeAcceptUrl(req, invite.token),
    expiresAt: invite.expiresAt.toISOString(),
    status: invite.status,
    email: invite.email,
    role: invite.role,
    ...(emailStatus ? { emailStatus } : {}),
  });
}

```

### src/pages/api/shopping/items/[id].ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Use a local union so we don't depend on enum import caching in editors
type ItemStatus = 'ACTIVE' | 'DONE';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

async function requireItemAccess(userId: string, itemId: string) {
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    select: { id: true, list: { select: { householdId: true } } },
  });
  if (!item) return null;
  const m = await prisma.membership.findFirst({
    where: { userId, householdId: item.list.householdId },
    select: { id: true },
  });
  return m ? item : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'PATCH') {
    const item = await requireItemAccess(userId, id);
    if (!item) return res.status(403).json({ error: 'Forbidden' });

    const patch = req.body as Partial<{
      title: string; qty: string; notes: string;
      category: string; store: string;
      status: ItemStatus;
    }>;

    const data: any = { updatedAt: new Date() };
    if (typeof patch.title === 'string') data.title = patch.title;
    if (typeof patch.qty === 'string') data.qty = patch.qty;
    if (typeof patch.notes === 'string') data.notes = patch.notes;
    if (typeof patch.category === 'string') data.category = patch.category;
    if (typeof patch.store === 'string') data.store = patch.store;

    if (patch.status === 'DONE') {
      data.status = 'DONE';
      data.doneAt = new Date();
      data.doneById = userId;
    } else if (patch.status === 'ACTIVE') {
      data.status = 'ACTIVE';
      data.doneAt = null;
      data.doneById = null;
    }

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ item: updated });
  }

  if (req.method === 'DELETE') {
    const item = await requireItemAccess(userId, id);
    if (!item) return res.status(403).json({ error: 'Forbidden' });

    await prisma.shoppingItem.delete({ where: { id } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/shopping/items/clear-done.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { listId } = (req.body || {}) as { listId?: string };
  if (!listId) return res.status(400).json({ error: 'Missing listId' });

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  });
  if (!list) return res.status(404).json({ error: 'List not found' });

  const isMember = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  });
  if (!isMember) return res.status(403).json({ error: 'Forbidden' });

  await prisma.shoppingItem.deleteMany({ where: { listId, status: 'DONE' } });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}

```

### src/pages/api/shopping/items/index.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

async function requireListAccess(userId: string, listId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { householdId: true },
  });
  if (!list) return null;

  const m = await prisma.membership.findFirst({
    where: { userId, householdId: list.householdId },
    select: { id: true },
  });
  return m ? list : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const listId = String(req.query.listId || '');
    if (!listId) return res.status(400).json({ error: 'Missing listId' });

    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });

    const items = await prisma.shoppingItem.findMany({
      where: { listId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { listId, title, qty } = (req.body || {}) as {
      listId?: string;
      title?: string;
      qty?: string;
    };
    if (!listId || !title) return res.status(400).json({ error: 'Missing listId or title' });

    const list = await requireListAccess(userId, listId);
    if (!list) return res.status(403).json({ error: 'Forbidden' });

    const item = await prisma.shoppingItem.create({
      data: {
        listId,
        title: title.trim(),
        qty: qty?.trim() || undefined,
        createdById: userId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        doneBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ item });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/shopping/lists/[id].ts
```ts
// /src/pages/api/shopping/lists/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  const id = req.query.id as string;
  if (!id) { res.status(400).json({ error: 'Missing id' }); return; }

  // Verify the list belongs to the user's active household
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  });
  const householdId = user?.activeHouseholdId;
  if (!householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'No active household selected' });
  }

  const list = await prisma.shoppingList.findUnique({ where: { id } });
  if (!list || list.householdId !== householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'List not found' });
  }

  if (req.method === 'PATCH') {
    const { name, archive, unarchive } = req.body as {
      name?: string; archive?: boolean; unarchive?: boolean;
    };

    const data: any = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (archive) data.archivedAt = new Date();
    if (unarchive) data.archivedAt = null;

    const updated = await prisma.shoppingList.update({ where: { id }, data });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ list: updated });
  }

  if (req.method === 'DELETE') {
    const force = (req.query.force as string | undefined) === 'true';
    const itemCount = await prisma.shoppingItem.count({ where: { listId: id } });
    if (itemCount > 0 && !force) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'List not empty. Use ?force=true to delete.' });
    }
    await prisma.shoppingList.delete({ where: { id } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/shopping/lists/index.ts
```ts
// /src/pages/api/shopping/lists/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = sess?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return userId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireUser(req, res);
  if (!userId) return;

  // Find active household for this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  });

  const householdId = user?.activeHouseholdId;
  if (!householdId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'No active household selected' });
  }

  if (req.method === 'GET') {
    const lists = await prisma.shoppingList.findMany({
      where: { householdId },
      orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }],
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ lists });
  }

  if (req.method === 'POST') {
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'Name is required' });
    }
    try {
      const list = await prisma.shoppingList.create({
        data: { householdId, name: name.trim() },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ list });
    } catch (e: any) {
      if (e.code === 'P2002') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(409).json({ error: 'List name already exists' });
      }
      throw e;
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

```

### src/pages/api/household/members/[id]/remove.ts
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end('Method Not Allowed'); }

  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const actingUserId = sess?.user?.id as string | undefined;
  if (!actingUserId) return res.status(401).json({ error: 'Unauthorized' });

  const membershipId = req.query.id as string;
  if (!membershipId) return res.status(400).json({ error: 'Missing membership id' });

  // Who are we removing?
  const target = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true, role: true, householdId: true },
  });
  if (!target) return res.status(404).json({ error: 'Membership not found' });

  // Acting user must be OWNER in that household
  const acting = await prisma.membership.findFirst({
    where: { userId: actingUserId, householdId: target.householdId },
    select: { role: true },
  });
  if (!acting || acting.role !== 'OWNER') return res.status(403).json({ error: 'Forbidden: owner role required' });

  // Safety rails
  if (target.role === 'OWNER') return res.status(400).json({ error: 'Cannot remove the household owner' });
  if (target.userId === actingUserId) return res.status(400).json({ error: 'Owners cannot remove themselves' });

  await prisma.membership.delete({ where: { id: target.id } });
  return res.status(200).json({ ok: true });
}

```

### src/pages/api/household/invites/[id]/resend.ts
```ts
// src/pages/api/household/invites/[id]/resend.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { sendInviteEmail } from '@/lib/mailer';

async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = sess?.user?.id as string | undefined;
  const semail = (sess?.user?.email as string | undefined)?.toLowerCase();
  if (!sid && !semail) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (sid) { const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } }); if (u) return u.id; }
  if (semail) { const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } }); if (u) return u.id; }
  res.status(401).json({ error: 'User for session not found. Please sign out and sign in again.' });
  return null;
}

async function requireMembershipIn(req: NextApiRequest, res: NextApiResponse, householdId: string, ownerOnly = false): Promise<boolean> {
  const userId = await resolveUserId(req, res);
  if (!userId) return false;
  const m = await prisma.membership.findFirst({ where: { userId, householdId }, select: { role: true } });
  if (!m) { res.status(403).json({ error: 'Forbidden: not a member of this household' }); return false; }
  if (ownerOnly && m.role !== 'OWNER') { res.status(403).json({ error: 'Forbidden: owner role required' }); return false; }
  return true;
}

function makeAcceptUrl(req: NextApiRequest, token: string) {
  const base = (process.env.INVITES_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/api/invites/accept?token=${encodeURIComponent(token)}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['host'] as string) || 'localhost:3000';
  return `${proto}://${host}/api/invites/accept?token=${encodeURIComponent(token)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end('Method Not Allowed'); }
  const { id } = req.query as { id: string };

  const invite = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, expiresAt: true, householdId: true, token: true },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (!(await requireMembershipIn(req, res, invite.householdId, true))) return;

  if (!invite.email) return res.status(400).json({ error: 'This invite has no email to resend' });
  if (invite.status !== 'PENDING') return res.status(400).json({ error: 'Only pending invites can be resent' });
  if (invite.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Invite is expired' });

  const household = await prisma.household.findUnique({ where: { id: invite.householdId }, select: { name: true } });
  const acceptUrl = makeAcceptUrl(req, invite.token);

  const r = await sendInviteEmail({
    to: invite.email,
    acceptUrl,
    inviterName: household?.name ? `${household.name} owner` : 'Household owner',
    householdName: household?.name || 'your household',
  });

  if (!r.ok) return res.status(502).json({ error: r.error, from: r.fromUsed, to: r.to });
  return res.status(200).json({ ok: true, id: r.providerId, from: r.fromUsed, to: r.to });
}

```

### src/pages/api/household/invites/[id]/revoke.ts
```ts
// src/pages/api/household/invites/[id]/revoke.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { InviteStatus } from '@prisma/client';

async function resolveUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sid = sess?.user?.id as string | undefined;
  const semail = (sess?.user?.email as string | undefined)?.toLowerCase();
  if (!sid && !semail) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (sid) { const u = await prisma.user.findUnique({ where: { id: sid }, select: { id: true } }); if (u) return u.id; }
  if (semail) { const u = await prisma.user.findUnique({ where: { email: semail }, select: { id: true } }); if (u) return u.id; }
  res.status(401).json({ error: 'User for session not found. Please sign out and sign in again.' });
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).end('Method Not Allowed'); }
  const { id } = req.query as { id: string };

  const invite = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, status: true, householdId: true },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  const userId = await resolveUserId(req, res);
  if (!userId) return;
  const membership = await prisma.membership.findFirst({
    where: { userId, householdId: invite.householdId },
    select: { role: true },
  });
  if (!membership) return res.status(403).json({ error: 'Forbidden: not a member of this household' });
  if (membership.role !== 'OWNER') return res.status(403).json({ error: 'Forbidden: owner role required' });

  if (invite.status !== 'PENDING') return res.status(400).json({ error: 'Only pending invites can be revoked' });

  await prisma.invite.update({
    where: { id },
    data: { status: ('REVOKED' as InviteStatus) },
  });

  return res.status(200).json({ ok: true });
}

```

### Components & Lib

### src/components/InvitePanel.tsx
```ts
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type CreateInviteResponse = {
  id: string;
  acceptUrl: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  email?: string | null;
  role: 'OWNER' | 'MEMBER';
  emailStatus?: { ok: boolean; error?: string };
};

export default function InvitePanel() {
  const { data: session, status } = useSession();
  const [householdId, setHouseholdId] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = submitting || !email || !householdId || status !== 'authenticated';

  // Derive/ensure householdId (same logic you approved earlier)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (status !== 'authenticated') return;
      const qs = new URLSearchParams(window.location.search);
      const hid = qs.get('hid');
      if (hid) { if (mounted) setHouseholdId(hid); return; }
      const sessionHid = (session as any)?.user?.activeHouseholdId as string | undefined;
      if (sessionHid) { if (mounted) setHouseholdId(sessionHid); return; }
      try {
        const r = await fetch('/api/household/create-default', { method: 'POST' });
        const j = await r.json();
        if (mounted) setHouseholdId(j?.householdId || '');
      } catch (e: any) {
        setError(e?.message || 'Could not get a household');
      }
    })();
    return () => { mounted = false; };
  }, [status, session]);

async function onInviteClick() {
  setSubmitting(true);
  setError(null);
  setResult(null);
  try {
    const r = await fetch('/api/household/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId, email: email.trim().toLowerCase(), role: 'MEMBER' }),
    });

    // Be robust if the server ever returns plain text (e.g., "Unauthorized")
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : await r.text();

    if (!r.ok) {
      const msg = typeof data === 'string' ? data : data?.error || `Invite failed (${r.status})`;
      throw new Error(msg);
    }

    const json = data as any;
    setResult(json);
    if (json.emailStatus && !json.emailStatus.ok) {
      setError(`Email didn’t send: ${json.emailStatus.error || 'unknown error'}`);
    }
    setEmail('');
  } catch (e: any) {
    setError(e?.message || 'Invite failed');
  } finally {
    setSubmitting(false);
  }
}


  return (
    <div className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur p-4 sm:p-5 shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Invite to household</h3>
      <p className="text-sm text-gray-600 mb-4">
        Send an email invite or share the link so your partner can join this household.
      </p>

      <div className="mb-2 text-xs text-gray-500">
        Household:&nbsp;<span className="font-mono">{householdId || '—'}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@example.com"
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
        />
        <button
          type="button"
          onClick={onInviteClick}
          disabled={disabled}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            disabled
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow-sm'
          }`}
        >
          {submitting ? 'Sending…' : 'Invite'}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600">{error}</div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-900">
            Invite created for{' '}
            <span className="font-medium">{result.email || 'link-only'}</span>
            {result.emailStatus?.ok ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                email sent
              </span>
            ) : result.email ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                email failed
              </span>
            ) : null}
          </div>

          <div>
            <div className="text-xs text-gray-600">Accept link (share if needed):</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-800">
                {result.acceptUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.acceptUrl)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```

### src/components/Layout.tsx
```ts
// src/components/Layout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LayoutProps { children: ReactNode }

const NAV = [
  { href: '/',         label: 'Home' },
  { href: '/shopping', label: 'Shopping' },
  // { href: '/dashboard', label: 'Finances (v1)' },
  { href: '/finances', label: 'Finances' },
  { href: '/settings', label: 'Household' },
];

export default function Layout({ children }: LayoutProps) {
  // Read pathname only on the client to avoid SSR issues
  const [path, setPath] = React.useState<string>('');
  React.useEffect(() => { setPath(window.location.pathname); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Brand (logo + wordmark) */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="relative inline-flex items-center justify-center">
              {/* Put /public/logo.png in your repo */}
              <Image
                src="/logo.png"
                alt="HouseFlow"
                width={50}
                height={50}
                className="rounded-md shadow-sm ring-1 ring-white/20"
                priority
              />
            </span>
            <span className="font-bold text-lg text-white/95 group-hover:text-white">
             
            </span>
          </Link>

          {/* horizontal scroll on mobile */}
          <nav className="ml-auto w-full sm:w-auto overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex gap-1">
              {NAV.map(({ href, label }) => {
                const active = path === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center px-3 py-2 rounded-full text-sm
                      ${active ? 'bg-white/25 text-white font-medium' : 'text-white/90 hover:text-white hover:bg-white/15'}
                      focus:outline-none focus:ring-2 focus:ring-white/50`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5">{children}</main>
    </div>
  );
}

```

### src/components/ListPicker.tsx
```ts
import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (u: string) => fetch(u, { credentials: 'include' }).then(r => r.json());

type Props = {
  selectedId: string | null;
  onChange: (id: string) => void;
};

export default function ListPicker({ selectedId, onChange }: Props) {
  const { data, mutate, isLoading } = useSWR('/api/shopping/lists', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const [newName, setNewName] = useState('');
  const lists = (data?.lists ?? []) as Array<any>;
  const activeLists = lists.filter((l) => !l.archivedAt);
  const archivedLists = lists.filter((l) => l.archivedAt);

  async function createList() {
    const name = newName.trim();
    if (!name) return;
    await fetch('/api/shopping/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    setNewName('');
    mutate();
  }

  async function renameList(id: string, name: string) {
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    mutate();
  }

  async function setArchive(id: string, archive: boolean) {
    await fetch(`/api/shopping/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(archive ? { archive: true } : { unarchive: true }),
    });
    mutate();
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this list? This cannot be undone.')) return;
    await fetch(`/api/shopping/lists/${id}?force=true`, { method: 'DELETE', credentials: 'include' });
    if (selectedId === id) onChange('');
    mutate();
  }

  const selected = lists.find((l) => l.id === selectedId);

  return (
    <div className="rounded-3xl p-4 bg-white/5 backdrop-blur shadow-sm">
      {/* Row 1: Select (full width on mobile) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Current list</label>
          <select
            className="w-full rounded-xl px-3 py-2 bg-white/10 min-h-[40px]"
            disabled={isLoading || lists.length === 0}
            value={selectedId ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <optgroup label="Active">
              {activeLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </optgroup>
            {archivedLists.length > 0 && (
              <optgroup label="Archived">
                {archivedLists.map(l => <option key={l.id} value={l.id}>{l.name} (archived)</option>)}
              </optgroup>
            )}
          </select>
        </div>

        {/* Row 1 right: Actions (wrap on mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-none sm:gap-2 sm:ml-2">
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px]"
            disabled={!selectedId}
            onClick={async () => {
              const name = prompt('Rename list', selected?.name ?? '');
              if (name && name.trim()) await renameList(selectedId!, name.trim());
            }}
          >
            Rename
          </button>
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px]"
            disabled={!selectedId}
            onClick={() => setArchive(selectedId!, !selected?.archivedAt)}
          >
            {selected?.archivedAt ? 'Unarchive' : 'Archive'}
          </button>
          <button
            className="col-span-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm min-h-[40px] text-red-600"
            disabled={!selectedId}
            onClick={() => deleteList(selectedId!)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Row 2: Create new list (stacks on mobile) */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <input
          className="rounded-xl px-3 py-2 bg-white/10 min-h-[40px]"
          placeholder="New list name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createList()}
        />
        <button
          className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm min-h-[40px]"
          onClick={createList}
        >
          Add
        </button>
      </div>
    </div>
  );
}

```

### src/lib/api-guards.ts
```ts
// src/lib/api-guard.ts
// Enforce per-household membership (and optional owner-only) inside API routes.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]'; // relative
import { prisma } from './prisma'; // relative

type AppSessionUser = { id?: string; email?: string | null; name?: string | null };
type AppSession = { user?: AppSessionUser | null };

/** Get userId from session or send 401 and return null */
export async function getUserIdOr401(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const sess = (await getServerSession(req, res, authOptions as any)) as AppSession | null;
  const uid = sess?.user?.id;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return uid;
}

/** Ensure the logged-in user is a member of the given household. Optionally require OWNER. */
export async function requireMembershipIn(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  { ownerOnly = false }: { ownerOnly?: boolean } = {}
): Promise<{ userId: string } | null> {
  if (!householdId) {
    res.status(400).json({ error: 'Missing householdId' });
    return null;
  }

  const userId = await getUserIdOr401(req, res);
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: 'Forbidden: not a member of this household' });
    return null;
  }
  if (ownerOnly && membership.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden: owner role required' });
    return null;
  }

  return { userId };
}

```

### src/lib/auth-helpers.ts
```ts
// src/lib/auth-helpers.ts
import { getToken } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import { prisma } from '@/lib/prisma';

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function requireUser(req: NextApiRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token || !token.sub) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: token.sub as string } });
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return { token, user };
}

export async function ensureOwner(userId: string, householdId: string) {
  // Owner check: either household ownerId or membership role OWNER
  const hh = await prisma.household.findUnique({ where: { id: householdId } });
  if (!hh) throw Object.assign(new Error('Household not found'), { status: 404 });
  if (hh.ownerId === userId) return hh;

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId, role: 'OWNER' },
  });
  if (!membership) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return hh;
}

export function acceptUrlForToken(token: string) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = new URL('/invite/accept', base);
  url.searchParams.set('token', token);
  return url.toString();
}

```

### src/lib/mailer.ts
```ts
// src/lib/mailer.ts
// Sends email via Resend. STRICT: sender must be on galeahub.online.
// Reads INVITES_FROM first, then MAIL_FROM. Returns provider message id for debugging.

export type MailResult =
  | { ok: true; providerId?: string; fromUsed: string; to: string }
  | { ok: false; error: string; fromUsed: string; to: string };

type SendInviteArgs = {
  to: string;
  acceptUrl: string;
  inviterName?: string | null;
  householdName?: string | null;
};

const REQUIRED_DOMAIN = 'galeahub.online';

export async function sendInviteEmail({
  to,
  acceptUrl,
  inviterName,
  householdName,
}: SendInviteArgs): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromHeader = (process.env.INVITES_FROM || process.env.MAIL_FROM || '').trim();
  const replyTo = (process.env.INVITES_REPLY_TO || '').trim();

  if (!to) return { ok: false, error: 'Missing recipient email', fromUsed: fromHeader, to: '' };
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set', fromUsed: fromHeader, to };

  const fromEmail = extractEmail(fromHeader);
  if (!fromHeader || !fromEmail) {
    return {
      ok: false,
      error: 'INVITES_FROM/MAIL_FROM not set or invalid. E.g. Houseflow <no-reply@galeahub.online>',
      fromUsed: fromHeader,
      to,
    };
  }
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (domain !== REQUIRED_DOMAIN) {
    return {
      ok: false,
      error: `Sender must use ${REQUIRED_DOMAIN} (got ${domain || 'unknown'}). Update INVITES_FROM.`,
      fromUsed: fromHeader,
      to,
    };
  }

  const subject = `Invitation to join your household on Houseflow`;
  const text = [
    `${inviterName || 'Someone'} invited you to join ${householdName || 'a household'} on Houseflow.`,
    '',
    `Accept: ${acceptUrl}`,
    '',
    `If you didn’t expect this, you can ignore this email.`,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#111; max-width:560px; margin:auto; padding:16px">
      <h2 style="margin:0 0 8px">Houseflow invite</h2>
      <p style="margin:0 0 12px">${escapeHtml(inviterName || 'Someone')} invited you to join <b>${escapeHtml(
        householdName || 'a household'
      )}</b> on Houseflow.</p>
      <p style="margin:0 0 16px">Click the button below to accept:</p>
      <p style="margin:0 0 24px">
        <a href="${acceptUrl}" style="background:#a21caf;color:#fff;text-decoration:none;padding:10px 14px;border-radius:12px;display:inline-block">
          Accept invite
        </a>
      </p>
      <p style="margin:0;color:#555;font-size:12px">If the button doesn’t work, paste this link in your browser:</p>
      <p style="word-break:break-all;font-size:12px;color:#555">${acceptUrl}</p>
    </div>
  `;

  try {
    const payload: any = {
      from: fromHeader,
      to,
      subject,
      text,
      html,
      headers: { 'Auto-Submitted': 'auto-generated' },
    };
    if (replyTo) payload.reply_to = replyTo;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await r.json() : await r.text();

    if (!r.ok) {
      const msg =
        typeof body === 'string'
          ? body
          : body?.error || body?.message || JSON.stringify(body || {});
      return { ok: false, error: `Resend ${r.status}: ${msg}`, fromUsed: fromHeader, to };
    }

    const providerId = typeof body === 'object' ? body?.id : undefined;
    return { ok: true, providerId, fromUsed: fromHeader, to };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e), fromUsed: fromHeader, to };
  }
}

function extractEmail(fromHeader: string): string | null {
  const angle = /<([^>]+)>/.exec(fromHeader);
  if (angle && angle[1]) return angle[1].trim();
  if (/^[^@\s]+@[^@\s]+$/.test(fromHeader)) return fromHeader;
  return null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[ch]
  );
}

```

### src/lib/prisma.ts
```ts
import { PrismaClient } from '@prisma/client';

declare global { var prisma: PrismaClient | undefined; }

export const prisma = global.prisma ?? new PrismaClient({ log: ['warn', 'error'] });
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

```

### src/lib/resend.ts
```ts
// src/lib/resend.ts
import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
export const resend = key ? new Resend(key) : null;

export async function sendInviteEmail(opts: {
  to: string;
  acceptUrl: string;
  householdName: string;
  invitedByName?: string | null;
}) {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' as const };
  }
  const from = process.env.INVITES_FROM || 'Houseflow <no-reply@galeahub.online>';

  const subject = `You're invited to ${opts.householdName} on Houseflow`;
  const text = [
    opts.invitedByName ? `${opts.invitedByName} invited you to join their household.` : `You’ve been invited to join a household.`,
    '',
    `Accept the invite: ${opts.acceptUrl}`,
    '',
    `If you weren’t expecting this, you can ignore this email.`,
  ].join('\n');

  try {
    const resp = await resend.emails.send({
      from,
      to: opts.to,
      subject,
      text,
    });
    if ((resp as any)?.error) {
      return { ok: false, error: String((resp as any).error) };
    }
    return { ok: true, id: (resp as any)?.id ?? null };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown Resend error' };
  }
}

```

### src/lib/useHouseholdId.ts
```ts
import { useEffect, useState } from 'react';

export function useHouseholdId() {
  const [householdId, setHouseholdId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const hid = qs.get('hid');

        if (hid) {
          // Persist as active globally
          const r = await fetch('/api/household/active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ householdId: hid }),
          });
          if (!r.ok) throw new Error(await r.text());
          if (!cancelled) { setHouseholdId(hid); setLoading(false); }
          return;
        }

        // Get active (DB-stored) or latest membership
        const g = await fetch('/api/household/active', { credentials: 'include' });
        if (!g.ok) throw new Error(await g.text());
        const j = await g.json();
        if (!cancelled) { setHouseholdId(j.householdId || ''); setLoading(false); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Failed to resolve household'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { householdId, loading, error };
}


```

### src/lib/usePageState.ts
```ts
import { useCallback, useEffect, useRef, useState } from 'react';

type Options<T> = {
  householdId: string;
  page: string;
  initial?: T;
  debounceMs?: number;
};

export function usePageState<T>({ householdId, page, initial, debounceMs = 300 }: Options<T>) {
  const [state, setState] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const qs = new URLSearchParams({ householdId, page }).toString();
      const res = await fetch(`/api/page-state?${qs}`);
      const json = await res.json();
      if (!alive) return;
      if (json?.ok) {
        setState(json.data ?? initial);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, page]);

  const persist = useCallback(
    (next: T) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await fetch('/api/page-state', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ householdId, page, data: next }),
        });
        setSaving(false);
      }, debounceMs);
    },
    [debounceMs, householdId, page]
  );

  const update = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setState((prev) => {
      const value = typeof next === 'function' ? (next as any)(prev) : next;
      persist(value);
      return value;
    });
  }, [persist]);

  return { state, setState: update, loading, saving };
}

```

### src/lib/usePriceSuggestions.ts
```ts
// src/lib/usePriceSuggestions.ts
import { useEffect, useState } from 'react';

export type SuggestItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceCents: number | null;
  url: string | null;
};

export function usePriceSuggestions(query: string) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    if (!query || query.trim().length < 2) { setItems([]); return; }

    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/prices/suggest?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!abort) setItems(data);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }, 200); // debounce

    return () => { abort = true; clearTimeout(t); };
  }, [query]);

  return { items, loading };
}
```

## 7. Auth (NextAuth)

### src/pages/api/auth/[...nextauth].ts
```ts
import type { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/', // our login page
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? '').toString().trim();
        const password = (credentials?.password ?? '').toString();

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Return a minimal object—id & email are enough; name optional
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
      async jwt({ token, user }) {
    if (user) { token.id = (user as any).id; token.email = user.email; token.name = user.name; }
    // Load activeHouseholdId on login
    if (token?.id) {
      const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { activeHouseholdId: true } });
      (token as any).activeHouseholdId = u?.activeHouseholdId ?? null;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user && token) {
      (session.user as any).id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = (token.name as string) ?? session.user.email ?? '';
      // expose active
      (session.user as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
    }
    return session;
    },
  },
};

export default NextAuth(authOptions);

```

## 8. Utilities / Scripts

### scripts/check-prices.js
```js
#!/usr/bin/env node
/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const store = await prisma.store.findUnique({
      where: { domain: 'smart.com.mt' },
      select: { id: true, name: true, domain: true, createdAt: true, updatedAt: true },
    });

    const storeId = store?.id || null;

    const products = storeId
      ? await prisma.priceProduct.count({ where: { storeId } })
      : 0;

    const offers = storeId
      ? await prisma.priceOffer.count({ where: { storeId } })
      : 0;

    const latest = storeId
      ? await prisma.priceOffer.findFirst({
          where: { storeId },
          orderBy: { scrapedAt: 'desc' },
          include: { product: { select: { name: true } } },
        })
      : null;

    console.log({
      store,
      products,
      offers,
      latestSample: latest?.product?.name,
      latestPriceCents: latest?.priceCents,
      latestAt: latest?.scrapedAt,
    });
  } catch (e) {
    console.error('check-prices error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();

```

### scripts/clear-data.ts
```ts

```

### scripts/delete-smart-data.js
```js
/* scripts/delete-smart-data.js */
/* eslint-disable no-console */
const { prisma } = require('./prisma');

async function deleteSmartData() {
  try {
    const store = await prisma.store.findUnique({
      where: { domain: 'www.smart.com.mt' },
    });

    if (!store) {
      console.log('No store found for www.smart.com.mt. Nothing to delete.');
      return;
    }

    // Delete offers first (due to foreign key constraints)
    const deletedOffers = await prisma.priceOffer.deleteMany({
      where: { product: { storeId: store.id } },
    });

    // Then delete products
    const deletedProducts = await prisma.priceProduct.deleteMany({
      where: { storeId: store.id },
    });

    // Finally, delete the store
    const deletedStore = await prisma.store.delete({
      where: { id: store.id },
    });

    console.log(`Deleted ${deletedOffers.count} offers, ${deletedProducts.count} products, and the store.`);
  } catch (e) {
    console.error('Error deleting data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSmartData();
```

### scripts/prisma.js
```js
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');

/**
 * For scripts, ALWAYS prefer DIRECT_URL (postgresql://...), falling back to DATABASE_URL.
 * This bypasses Prisma Accelerate/Data Proxy which can block heavy ETL writes.
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

module.exports = { prisma };
```

### scripts/scrape-smart.js
```js
/* scripts/scrape-smart.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium, request } = require('playwright');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'http://www.smart.com.mt',
};

// Hardcoded top nav categories - scrape these for everything in one go per menu
const TOP_DEPARTMENTS = [
  { name: 'Baby', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-55' },
  { name: 'Bakery', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-10' },
  { name: 'Drinks', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-15' },
  { name: 'Food Cupboard', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-20' },
  { name: 'Fresh Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-25' },
  { name: 'Frozen Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-30' },
  { name: 'General', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-60' },
  { name: 'Health and Beauty', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-35' },
  { name: 'Home', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-40' },
  { name: 'Household', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-45' },
  { name: 'Pets', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-50' },
];

/* Debug flags (handy while fixing pagination)
   Example: DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 CONCURRENCY=3 PAGE_DELAY=2000 HEADLESS=false node scripts/scrape-smart.js */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const PAGE_DELAY = parseInt(process.env.PAGE_DELAY || '0', 10);
const HEADLESS = process.env.HEADLESS !== 'false';

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug');
if (DEBUG_DUMP) ensureDir(dumpDir);

/* ------------------------------ Utils ---------------------------------- */

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function parsePriceToCents(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g, '').replace(',', '.');
  const f = parseFloat(t);
  return Number.isFinite(f) ? Math.round(f * 100) : null;
}

async function ensureStore() {
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function acceptCookies(page) {
  const candidates = [
    'text=Accept All','text=Accept all','text=Accept',
    'button:has-text("Accept")','text=I understand','text=Agree',
    '.cookie-accept','#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(() => {}); break; }
    } catch {}
  }
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
}

async function httpProbe(url, proxyUrl) {
  const ctx = await request.newContext({
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  try {
    const r = await ctx.get(url, { timeout: 15000 });
    console.log('HTTP probe', url, '->', r.status());
    return r.ok();
  } catch (e) {
    console.log('HTTP probe failed:', e.message);
    return false;
  } finally {
    await ctx.dispose();
  }
}

/* ------------------------- Grid targeting --------------------------- */

async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      const baseId = id.replace(/_DX.*$/, '');
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);
  if (!info.length) return null;
  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];
  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerTopSel = `#${cssEscape(best.baseId + '_DXPagerTop')}`;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  return { baseId: best.baseId, tableSel, pagerTopSel, pagerBottomSel };
}
function cssEscape(s) { return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1'); }

/* ---------- Fast, light “content changed” checks (avoid long waits) -------- */

async function gridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, t => (t.innerText || '').trim());
}
async function waitGridChanged(page, tableSel, oldSig, timeout = 60000) {
  if (!tableSel) return false;
  return await page.waitForFunction((sel, prev) => {
    const t = document.querySelector(sel);
    if (!t) return false;
    const sig = (t.innerText || '').trim();
    return sig && sig !== prev;
  }, tableSel, oldSig, { timeout }).then(() => true).catch(() => false);
}

async function readPagerInfo(page, pagerSel) {
  const curFromSpan = await page.$eval(pagerSel, root => {
    const cur = root.querySelector('span.dxp-current, [aria-current="page"]');
    return cur ? (cur.textContent || '').trim() : '';
  }).catch(() => '');
  let cur = parseInt(curFromSpan, 10);
  if (!Number.isFinite(cur)) {
    const summary = await page.$eval(pagerSel, root => {
      const s = root.querySelector('.dxp-summary, .dxp-lead');
      return s ? (s.textContent || '').trim() : '';
    }).catch(() => '');
    const m = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(summary);
    if (m) cur = parseInt(m[1], 10);
  }
  const totalTxt = await page.$eval(pagerSel, root => {
    const s = root.querySelector('.dxp-summary, .dxp-lead');
    return s ? (s.textContent || '').trim() : '';
  }).catch(() => '');
  const m2 = /Page\s+\d+\s+of\s+(\d+)/i.exec(totalTxt);
  const total = m2 ? parseInt(m2[1], 10) : null;
  return { cur: Number.isFinite(cur) ? cur : null, total };
}

async function waitPagerIncrement(page, pagerSel, prev, timeout = 60000) {
  if (prev == null) return false;
  return await page.waitForFunction((sel, p) => {
    const r = document.querySelector(sel);
    if (!r) return false;
    const curEl = r.querySelector('span.dxp-current, [aria-current="page"]');
    if (curEl) {
      const n = parseInt((curEl.textContent || '').trim(), 10);
      return Number.isFinite(n) && n > p;
    }
    const sEl = r.querySelector('.dxp-summary, .dxp-lead');
    if (sEl) {
      const m = /Page\s+(\d+)\s+of\s+\d+/.exec(sEl.textContent || '');
      if (m) {
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) && n > p;
      }
    }
    return false;
  }, pagerSel, prev, { timeout }).then(() => true).catch(() => false);
}

/* ----------------------- Pager interaction (hybrid click + JS) -------------------- */

async function goNextPage(page, ctx) {
  if (!ctx) return false;
  const { baseId, tableSel, pagerTopSel, pagerBottomSel } = ctx;
  let { cur } = await readPagerInfo(page, pagerTopSel);
  if (cur == null) ({ cur } = await readPagerInfo(page, pagerBottomSel));
  if (cur == null) { console.log('Pager: cannot read current page'); return false; }
  const beforeSig = await gridSignature(page, tableSel);
  const t0 = Date.now();
  // Try click first
  let advanced = false;
  const nextSel = `${pagerTopSel} a.dxp-button.dxp-bt, ${pagerBottomSel} a.dxp-button.dxp-bt, ${pagerTopSel} a[onclick*="PBN"], ${pagerBottomSel} a[onclick*="PBN"], ${pagerTopSel} img[alt="Next"], ${pagerBottomSel} img[alt="Next"], a[title="Next"], a:has-text(">") , .next-page`;
  await page.waitForSelector(nextSel, { state: 'attached' }).catch(() => {});  // Wait for attachment to fix detach error
  const nextEl = await page.$(nextSel).catch(() => null);
  if (nextEl) {
    console.log('Found next button with selector; attempting click...');
    await nextEl.click({ force: true }).catch(e => console.log('Click failed:', e.message));
    await page.waitForLoadState('networkidle').catch(() => {});
    advanced = await waitGridChanged(page, tableSel, beforeSig, 60000);
  }
  // Fallback to JS callback if click didn't advance
  if (!advanced) {
    console.log('Click did not advance; falling back to JS callback for next page...');
    const token = `__dx_end_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fired = await page.evaluate(({ gridId, token }) => {
      const getClient = () => {
        const direct = window[gridId];
        if (direct) return direct;
        try {
          if (window.ASPx && ASPx.GetControlCollection) {
            return ASPx.GetControlCollection().GetByName(gridId) || null;
          }
        } catch {}
        return null;
      };
      const gv = getClient();
      if (!gv) return { ok: false, why: 'no client object' };
      const handler = function onEnd() {
        try { gv.EndCallback && gv.EndCallback.RemoveHandler(onEnd); } catch {}
        window[token] = 'done';
      };
      try {
        if (gv.EndCallback && gv.EndCallback.AddHandler) gv.EndCallback.AddHandler(handler);
      } catch {}
      try {
        if (typeof gv.PerformCallback === 'function') {
          gv.PerformCallback('PBN');  // PBN for Page Next
        } else if (typeof window.aspxGVPagerOnClick === 'function') {
          window.aspxGVPagerOnClick(gridId, 'PBN');
        } else {
          return { ok: false, why: 'no pager method' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, why: String(e) };
      }
    }, { gridId: baseId, token });
    if (fired.ok) {
      const endHit = await page.waitForFunction(tok => window[tok] === 'done', token, { timeout: 60000 }).then(() => true).catch(() => false);
      advanced = endHit || await waitGridChanged(page, tableSel, beforeSig, 60000);
    } else {
      console.log('JS callback failed:', fired.why);
    }
  }
  const timeTaken = Date.now() - t0;
  console.log(`Pager flip ${advanced ? 'OK' : 'FAILED'} in ${timeTaken}ms (from ${cur} -> ${cur + 1})`);
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
  return advanced;
}

/* --------------------------- Discovery / parse --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(), href: a.href
  })).filter(x => x.href && x.href.startsWith('http')));
  const nameSet = new Set(TOP_DEPARTMENTS.map(d => d.name.toLowerCase()));
  const links = anchors.filter(a => {
    const t = normalizeName(a.text);
    const isDeptText = nameSet.has(t);
    const looksLikeCat = /(category|categories|department|products|departmentid|cat|dept|groceries)/i.test(a.href) || /Products\.aspx/i.test(a.href);
    return isDeptText || looksLikeCat;
  });
  const seen = new Set();
  const cleaned = [];
  for (const l of links) {
    try {
      const u = new URL(l.href);
      const key = u.origin + u.pathname + u.search;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({
          name: l.text || u.search.slice(1) || u.pathname.split('/').filter(Boolean).pop() || 'Department',
          href: u.toString().replace('https://', 'http://'),
        });
      }
    } catch {}
  }
  const filtered = cleaned.filter(l => !/(account|login|cart|checkout|about|contact)/i.test(l.href));
  const uniq = [];
  const seenHref = new Set();
  for (const l of filtered) {
    if (!seenHref.has(l.href)) { uniq.push(l); seenHref.add(l.href); }
  }
  const strong = uniq.filter(l => /(department|category|products)/i.test(l.href));
  const final = strong.length ? strong : uniq;
  return final
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER))
    .slice(0, 80);
}

async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;
    const ctxBefore = await getGridContext(page);
    const sigBefore = ctxBefore?.tableSel ? await gridSignature(page, ctxBefore.tableSel) : '';
    try {
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const values = opts.map(o => parseInt(o.value, 10)).filter(Number.isFinite);
        if (!values.length) return { success: false, max: 0 };
        const max = Math.max(...values);
        const opt = opts.find(o => parseInt(o.value, 10) === max);
        if (!opt) return { success: false, max: 0 };
        node.value = opt.value;
        return { success: true, max };
      }).catch(() => ({ success: false, max: 0 }));
      if (!picked.success) continue;
      console.log(`Set items per page to max: ${picked.max}`);
      const onchange = await el.getAttribute('onchange').catch(() => null);
      if (onchange && /__doPostBack/.test(onchange)) {
        await page.evaluate((sel) => {
          const node = document.querySelector(sel);
          if (!node) return;
          if (typeof window.__doPostBack === 'function') {
            const name = node.name || node.id || '';
            window.__doPostBack(name, '');
          } else {
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, sel);
      } else {
        await page.selectOption(sel, { value: String(picked.max) }).catch(() => {});
      }
      const ctxAfter = await getGridContext(page);
      const selAfter = ctxAfter?.tableSel || ctxBefore?.tableSel;
      const changed = await waitGridChanged(page, selAfter, sigBefore, 60000);
      if (changed) {
        return true;
      }
    } catch {}
  }
  return false;
}

async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => el && el.offsetParent !== null;
    const stripScripts = (root) => {
      root.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return root;
    };
    const textFrom = (el) => {
      const clone = el.cloneNode(true);
      stripScripts(clone);
      return (clone.innerText || '').replace(/\s+/g, ' ').trim();
    };
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return [];
    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);
    const out = [];
    for (const row of dataRows) {
      if (!visible(row)) continue;
      const tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 2) continue;
      const rowText = textFrom(row);
      if (!/€\s*\d/.test(rowText)) continue;
      const imgEl = row.querySelector('img');
      const imgAlt = imgEl?.getAttribute('alt')?.trim() || '';
      let name = '';
      const nameCandidates = Array.from(row.querySelectorAll('td a, td span, td div'))
        .filter((n) =>
          visible(n) &&
          !n.querySelector('img') &&
          !/add|basket|cart|button|qty|quantity/i.test(n.className || '') &&
          (n.innerText || '').trim().length > 1
        )
        .map((n) => (n.innerText || '').trim());
      name = nameCandidates.find((t) => !/€\s*\d/.test(t)) || imgAlt;
      if (!name) {
        name = rowText.replace(/€\s*\d[\d\.,]*/g, '').trim();
        if (name.length > 120) name = name.slice(0, 120);
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name || name === 'Items per page:') continue;
      let priceStr = '';
      const tdTexts = tds.map((td) => textFrom(td));
      for (const tx of tdTexts) {
        const m = tx.match(/€\s*\d[\d\.,]*/);
        if (m) { priceStr = m[0]; break; }
      }
      if (!priceStr) continue;
      let unit = '';
      const unitEl = row.querySelector('small, .unit, .size');
      if (unitEl) unit = (unitEl.innerText || '').trim();
      if (!unit) {
        const m = rowText.match(/(?:per|\/)\s*[A-Za-z]+|[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets)/i);
        if (m) unit = m[0].trim();
      }
      if (/items per page/i.test(unit)) unit = '';
      let link = '';
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      link = linkEl?.href || '';
      const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset') || '';
      const brand = (name.split(/\s+/).find((w) => !/\d/.test(w)) || '') || '';
      out.push({ name, price: priceStr, unit, link, image, brand });
    }
    return out;
  });
  console.log(`Parsed ${products.length} product rows`);
  return products;
}

/* ------------------------------- DB upsert -------------------------------- */

async function batchUpsertProductsAndOffers(store, items, categoryPath, pageUrl, isDryRun) {
  if (isDryRun) {
    items.forEach(p => console.log(`[DRYRUN] ${categoryPath} :: ${p.name} — ${p.price} ${p.unit || ''}`));
    return items.length;
  }
  const productData = items.map(p => ({
    name: p.name,
    brand: p.brand || null,
    imageUrl: p.image || null,
    nameNormalized: normalizeName(p.name),
    storeId: store.id,
    sourceUrl: p.link || `${pageUrl}#${normalizeName(p.name)}`,
  }));
  const products = await Promise.all(productData.map(data => 
    prisma.priceProduct.upsert({
      where: { sourceUrl: data.sourceUrl },
      update: data,
      create: data,
    })
  ));
  const offerData = products.map((prod, i) => ({
    productId: prod.id,
    priceCents: parsePriceToCents(items[i].price),
    unit: items[i].unit || null,
    category: categoryPath || null,
  }));
  const validOffers = offerData.filter(o => o.priceCents != null);
  if (validOffers.length) {
    await prisma.priceOffer.createMany({ data: validOffers });
  }
  return validOffers.length;
}

/* --------------------------------- Main ----------------------------------- */

async function createContext(browser, proxyUrl) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HouseflowScraper/1.0 Chrome/120 Safari/537.36',
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  await context.route('**/*', (route) => {
    const r = route.request();
    const type = r.resourceType();
    const url = r.url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      /\.woff2?$|\.ttf$|\.otf$|\.png$|\.jpe?g$|\.gif$|\.webp$|\.mp4$|\.avi$/i.test(url) ||
      /google-analytics\.com|gtag\/js|googletagmanager\.com|facebook\.com\/tr|hotjar\.com|doubleclick\.net/i.test(url)
    ) return route.abort();
    return route.continue();
  });
  return context;
}

// Use hardcoded tops, filter by CAT
const allDepts = CAT_FILTER ? TOP_DEPARTMENTS.filter(d => normalizeName(d.name).includes(CAT_FILTER)) : TOP_DEPARTMENTS;

async function scrapeDepartment(dept, store, browser, proxyUrl, isDryRun) {
  const context = await createContext(browser, proxyUrl);
  const page = await context.newPage();
  try {
    const categoryPath = dept.name;
    console.log(`\n📁 [Parallel] Processing: ${categoryPath} (${dept.href})`);
    const deptStart = Date.now();
    await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await setItemsPerPage(page);
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerTopSel || ctx0?.pagerBottomSel) {
        const sel = (ctx0.pagerTopSel || '') + (ctx0.pagerBottomSel ? `, ${ctx0.pagerBottomSel}` : '');
        const summary = await page.$eval(sel, el => (el.textContent || '').trim()).catch(() => null);
        if (summary) console.log('Pager text:', summary);
      }
    } catch {}
    let pageNum = 1;
    let deptProducts = 0;
    let deptOffers = 0;
    for (;;) {
      const pageStart = Date.now();
      const ctx = await getGridContext(page);
      if (!ctx?.tableSel) {
        if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
        console.log('⚠️ No product grid detected; dumped HTML for inspection.');
        break;
      }
      const items = await collectProductsOnPage(page, ctx);
      console.log(`🧾 [${categoryPath}] Page ${pageNum}: found ${items.length} items (took ${(Date.now() - pageStart)/1000}s)`);
      if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
      const processed = await batchUpsertProductsAndOffers(store, items, categoryPath, page.url(), isDryRun);
      deptProducts += items.length;
      deptOffers += processed;
      if (MAX_PAGES && pageNum >= MAX_PAGES) break;
      const advanced = await goNextPage(page, ctx);
      if (!advanced) break;
      pageNum++;
    }
    console.log(`Finished ${categoryPath} in ${(Date.now() - deptStart)/1000/60} min (products: ${deptProducts}, offers: ${deptOffers})`);
    return { products: deptProducts, offers: deptOffers };
  } finally {
    await context.close();
  }
}

async function run() {
  console.log('▶️ Starting Smart scraper…');
  if (!process.env.DATABASE_URL && !process.env.DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for no-DB test)');
  }
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const reachable = await httpProbe(STORE.baseUrl, proxyUrl);  // Probe HTTP
  if (!reachable) {
    console.error('❌ Not reachable. Fix proxy/DNS or run from a VM that can reach the site.');
    return;
  }
  const store = await ensureStore();
  const browser = await chromium.launch({ headless: HEADLESS });
  const isDryRun = !!process.env.DRYRUN;
  try {
    let totalProducts = 0;
    let totalOffers = 0;
    // Parallel scrape depts in batches
    for (let i = 0; i < allDepts.length; i += CONCURRENCY) {
      const batch = allDepts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(dept => scrapeDepartment(dept, store, browser, proxyUrl, isDryRun)));
      results.forEach(res => {
        totalProducts += res.products;
        totalOffers += res.offers;
      });
    }
    console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
  } finally {
    await browser.close();
  }
}

/* ------------------------------ Debug helpers ------------------------------ */
async function dumpDebug(page, category, pageNum, ctx) {
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g, '_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true }).catch(() => {});
    if (ctx?.tableSel) {
      const tableHtml = await page.$eval(ctx.tableSel, n => n.outerHTML).catch(() => null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
    if (ctx?.pagerTopSel || ctx?.pagerBottomSel) {
      const sel = (ctx.pagerTopSel || '') + (ctx.pagerBottomSel ? `, ${ctx.pagerBottomSel}` : '');
      const pagerHtml = await page.$eval(sel, n => n.outerHTML).catch(() => null);
      if (pagerHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_pager.html`), pagerHtml);
    }
  } catch {}
}

/* --------------------------------- Runner ---------------------------------- */
run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### scripts/scrape-smartworking.js
```js
/* scripts/scrape-smart.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium, request } = require('playwright');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'https://www.smart.com.mt',
};

const FALLBACK_DEPT_NAMES = [
  'Baby','Bakery','Drinks','Food Cupboard','Fresh Food',
  'Frozen Food','General','Health and Beauty','Home','Household','Pets'
];

/* ---------- Debug & control flags (useful while fixing pagination) ---------- */
/* Examples:
 *   DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 node scripts/scrape-smart.js
 */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();       // filter departments by name
const MAX_PAGES  = parseInt(process.env.MAX_PAGES || '0', 10) || 0;    // cap pages per department (0 = no cap)
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;                            // dump HTML+screenshots to ./smart_debug

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug');
if (DEBUG_DUMP) ensureDir(dumpDir);

/* ------------------------------ Utilities ---------------------------------- */

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parsePriceToCents(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g, '').replace(',', '.');
  const f = parseFloat(t);
  return Number.isFinite(f) ? Math.round(f * 100) : null;
}

async function ensureStore() {
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function acceptCookies(page) {
  const candidates = [
    'text=Accept All', 'text=Accept all', 'text=Accept',
    'button:has-text("Accept")', 'text=I understand', 'text=Agree',
    '.cookie-accept', '#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click().catch(() => {});
        await page.waitForTimeout(400);
        break;
      }
    } catch {}
  }
}

async function httpProbe(url, proxyUrl) {
  const ctx = await request.newContext({
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  try {
    const r = await ctx.get(url, { timeout: 15000 });
    console.log('HTTP probe', url, '->', r.status());
    return r.ok();
  } catch (e) {
    console.log('HTTP probe failed:', e.message);
    return false;
  } finally {
    await ctx.dispose();
  }
}

/* ------------------------- Grid targeting helpers -------------------------- */

/** Choose the visible gvProducts *main* table (largest area), derive its base id. */
async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      // DevExpress main table ids typically end with _DXMainTable; strip _DX... to get base
      const baseId = id.replace(/_DX.*$/, ''); // e.g., ctl00_cphNestedMasterPage_gvProducts
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);

  if (!info.length) return null;

  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];

  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  const pagerTopSel    = `#${cssEscape(best.baseId + '_DXPagerTop')}`;

  return { tableSel, baseId: best.baseId, pagerSel: `${pagerBottomSel}, ${pagerTopSel}` };
}

function cssEscape(s) {
  return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

async function readPagerInfo(page, pagerSel) {
  // read current page: prefer span.dxp-current, fallback to summary "Page X of Y"
  const curFromSpan = await page.$eval(pagerSel, root => {
    const cur = root.querySelector('span.dxp-current, [aria-current="page"]');
    return cur ? (cur.textContent || '').trim() : '';
  }).catch(() => '');
  let cur = parseInt(curFromSpan, 10);

  if (!Number.isFinite(cur)) {
    const summary = await page.$eval(pagerSel, root => {
      const s = root.querySelector('.dxp-summary, .dxp-lead');
      return s ? (s.textContent || '').trim() : '';
    }).catch(() => '');
    const m = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(summary);
    if (m) cur = parseInt(m[1], 10);
  }

  const totalMatch = await page.$eval(pagerSel, root => {
    const s = root.querySelector('.dxp-summary, .dxp-lead');
    return s ? (s.textContent || '').trim() : '';
  }).catch(() => '');
  const m2 = /Page\s+\d+\s+of\s+(\d+)/i.exec(totalMatch);
  const total = m2 ? parseInt(m2[1], 10) : null;

  return { cur: Number.isFinite(cur) ? cur : null, total };
}

async function getGridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, t => (t.innerText || '').slice(0, 4000)).catch(() => '');
}

async function waitGridChangeBySig(page, tableSel, oldSig) {
  if (!tableSel) return;
  await page.waitForFunction((sel, prev) => {
    const t = document.querySelector(sel);
    if (!t) return false;
    const sig = (t.innerText || '').slice(0, 4000);
    return sig && sig !== prev;
  }, tableSel, oldSig, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);
}

/* ---------------------------- Pager interaction ---------------------------- */

/** Call DevExpress pager for this grid; verify page number or content changed. */
async function clickNextForThisGrid(page, ctx) {
  if (!ctx) return false;
  const { baseId, tableSel } = ctx;

  const topSel    = `#${cssEscape(baseId + '_DXPagerTop')}`;
  const bottomSel = `#${cssEscape(baseId + '_DXPagerBottom')}`;

  let { cur } = await readPagerInfo(page, topSel);
  if (cur == null) ({ cur } = await readPagerInfo(page, bottomSel));
  if (cur == null) return false;

  const beforeSig = await getGridSignature(page, tableSel);

  // Prefer invoking DevExpress' official pager hook
  const invoked = await page.evaluate(({ gridId, cur }) => {
    const nextIndex = cur; // PN index is 0-based; if cur=1, next is PN1
    const arg = 'PN' + nextIndex; // PageNumber(nextIndex)
    if (typeof window.aspxGVPagerOnClick === 'function') {
      window.aspxGVPagerOnClick(gridId, arg);
      return true;
    }
    // Fallback: try clicking the right anchor inside this grid's pagers
    const roots = [
      document.getElementById(gridId + '_DXPagerTop'),
      document.getElementById(gridId + '_DXPagerBottom')
    ].filter(Boolean);
    for (const root of roots) {
      let a =
        root.querySelector(`a[onclick*="aspxGVPagerOnClick('${gridId}','${arg}')"]`) ||
        root.querySelector('a[onclick*="PBN"]') ||
        Array.from(root.querySelectorAll('a')).find(el => /Next|›|>/.test(el.textContent || ''));
      if (a) {
        a.click();
        return true;
      }
    }
    return false;
  }, { gridId: baseId, cur });

  if (!invoked) return false;

  // Wait for pager number to increment on either pager; fallback to grid signature change
  const waitInc = async (sel, prev) => {
    if (prev == null) return false;
    return await page.waitForFunction((s, p) => {
      const r = document.querySelector(s);
      if (!r) return false;
      const curEl = r.querySelector('span.dxp-current, [aria-current="page"]');
      if (curEl) {
        const n = parseInt((curEl.textContent || '').trim(), 10);
        return Number.isFinite(n) && n > p;
      }
      const sEl = r.querySelector('.dxp-summary, .dxp-lead');
      if (sEl) {
        const m = /Page\s+(\d+)\s+of\s+\d+/.exec(sEl.textContent || '');
        if (m) {
          const n = parseInt(m[1], 10);
          return Number.isFinite(n) && n > p;
        }
      }
      return false;
    }, sel, cur, { timeout: 8000 }).then(() => true).catch(() => false);
  };

  let advanced = (await waitInc(topSel, cur)) || (await waitInc(bottomSel, cur));
  if (!advanced) {
    await waitGridChangeBySig(page, tableSel, beforeSig);
    const afterSig = await getGridSignature(page, tableSel);
    advanced = !!afterSig && afterSig !== beforeSig;
  }
  return advanced;
}

/* --------------------------- Discovery / parsing --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(),
    href: a.href
  })).filter(x => x.href && x.href.startsWith('http')));
  const nameSet = new Set(FALLBACK_DEPT_NAMES.map(n => n.toLowerCase()));
  const links = anchors.filter(a => {
    const t = normalizeName(a.text);
    const isDeptText = nameSet.has(t);
    const looksLikeCat = /(category|categories|department|products|departmentid|cat|dept|groceries)/i.test(a.href) || /Products\.aspx/i.test(a.href);
    return isDeptText || looksLikeCat;
  });

  const seen = new Set();
  const cleaned = [];
  for (const l of links) {
    try {
      const u = new URL(l.href);
      const key = u.origin + u.pathname + u.search;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({
          name: l.text || u.search.slice(1) || u.pathname.split('/').filter(Boolean).pop() || 'Department',
          href: u.toString(),
        });
      }
    } catch {}
  }

  const filtered = cleaned.filter(
    l => !/(account|login|cart|checkout|about|contact)/i.test(l.href)
  );

  const uniq = [];
  const seenHref = new Set();
  for (const l of filtered) {
    if (!seenHref.has(l.href)) {
      uniq.push(l);
      seenHref.add(l.href);
    }
  }

  const strong = uniq.filter(l => /(department|category|products)/i.test(l.href));
  const final = strong.length ? strong : uniq;

  return final
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER))
    .slice(0, 80);
}

async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;
    try {
      const onchange = await el.getAttribute('onchange').catch(() => null);
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const opt = opts.find(o => o.value === '50') || opts.find(o => /50/.test(o.textContent || ''));
        if (!opt) return false;
        node.value = opt.value;
        return true;
      }).catch(() => false);
      if (!picked) continue;

      if (onchange && /__doPostBack/.test(onchange)) {
        await page.evaluate((sel) => {
          const node = document.querySelector(sel);
          if (!node) return;
          if (typeof window.__doPostBack === 'function') {
            const name = node.name || node.id || '';
            window.__doPostBack(name, '');
          } else {
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, sel);
      } else {
        await page.selectOption(sel, { label: '50' }).catch(() => {});
        await page.selectOption(sel, { value: '50' }).catch(() => {});
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(250);
      return true;
    } catch {}
  }
  return false;
}

/** Scrape products from THIS grid (uses ctx.tableSel). */
async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      return s && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const stripScripts = (root) => {
      root.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return root;
    };
    const textFrom = (el) => {
      const clone = el.cloneNode(true);
      stripScripts(clone);
      return (clone.innerText || '').replace(/\s+/g, ' ').trim();
    };

    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return [];

    // Skip header and pager rows
    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);

    const out = [];
    for (const row of dataRows) {
      if (!visible(row)) continue;

      const tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 2) continue;

      const rowText = textFrom(row);
      if (!/€\s*\d/.test(rowText)) continue;

      const imgEl = row.querySelector('img');
      const imgAlt = imgEl?.getAttribute('alt')?.trim() || '';

      // Prefer visible text in description cell (exclude qty/buttons)
      let name = '';
      const nameCandidates = Array.from(row.querySelectorAll('td a, td span, td div'))
        .filter((n) =>
          visible(n) &&
          !n.querySelector('img') &&
          !/add|basket|cart|button|qty|quantity/i.test(n.className || '') &&
          (n.innerText || '').trim().length > 1
        )
        .map((n) => (n.innerText || '').trim());
      name = nameCandidates.find((t) => !/€\s*\d/.test(t)) || imgAlt;
      if (!name) {
        name = rowText.replace(/€\s*\d[\d\.,]*/g, '').trim();
        if (name.length > 120) name = name.slice(0, 120);
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name || name === 'Items per page:') continue;

      // Price
      let priceStr = '';
      const tdTexts = tds.map((td) => textFrom(td));
      for (const tx of tdTexts) {
        const m = tx.match(/€\s*\d[\d\.,]*/);
        if (m) { priceStr = m[0]; break; }
      }
      if (!priceStr) continue;

      // Unit
      let unit = '';
      const unitEl = row.querySelector('small, .unit, .size');
      if (unitEl) unit = (unitEl.innerText || '').trim();
      if (!unit) {
        const m = rowText.match(/(?:per|\/)\s*[A-Za-z]+|[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets)/i);
        if (m) unit = m[0].trim();
      }
      if (/items per page/i.test(unit)) unit = '';

      // Link
      let link = '';
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      link = linkEl?.href || '';

      const image =
        imgEl?.getAttribute('src') ||
        imgEl?.getAttribute('data-src') ||
        imgEl?.getAttribute('srcset') ||
        '';

      const brand = (name.split(/\s+/).find((w) => !/\d/.test(w)) || '') || '';

      out.push({ name, price: priceStr, unit, link, image, brand });
    }
    return out;
  });

  console.log(`Parsed ${products.length} product rows`);
  return products;
}

/* ------------------------------- DB upsert --------------------------------- */

async function upsertProductOffer(store, p, sourceUrl, category) {
  const cents = parsePriceToCents(p.price);
  if (cents == null) return false;

  if (process.env.DRYRUN) {
    console.log(`[DRYRUN] ${category} :: ${p.name} — ${p.price} ${p.unit || ''}`);
    return true;
  }

  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const product = await prisma.priceProduct.upsert({
        where: { sourceUrl },
        update: {
          name: p.name,
          brand: p.brand || null,
          imageUrl: p.image || null,
          nameNormalized: normalizeName(p.name),
          storeId: store.id,
        },
        create: {
          storeId: store.id,
          name: p.name,
          brand: p.brand || null,
          sourceUrl,
          imageUrl: p.image || null,
          nameNormalized: normalizeName(p.name),
        },
      });
      await prisma.priceOffer.create({
        data: {
          productId: product.id,
          priceCents: cents,
          unit: p.unit || null,
          category: category || null,
        },
      });
      return true;
    } catch (e) {
      attempts++;
      console.warn(`Upsert failed (attempt ${attempts}/${maxAttempts}):`, e.message);
      if (e.code === 'P1017') {
        await prisma.$disconnect().catch(() => {});
        await prisma.$connect().catch(() => {});
        await new Promise(r => setTimeout(r, 1000 * attempts));
      } else {
        throw e;
      }
      if (attempts === maxAttempts) {
        console.error('Max retries reached for upsert.');
        return false;
      }
    }
  }
  return false;
}

/* --------------------------------- Main ------------------------------------ */

async function run() {
  console.log('▶️ Starting Smart scraper…');
  if (!process.env.DATABASE_URL && !process.env.DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for no-DB test)');
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const reachable = await httpProbe(STORE.baseUrl.replace('https://', 'http://'), proxyUrl);
  if (!reachable) {
    console.error('❌ Not reachable. Fix proxy/DNS or run from a VM that can reach the site.');
    return;
  }

  const store = await ensureStore();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HouseflowScraper/1.0 Chrome/120 Safari/537.36',
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  const page = await context.newPage();

  console.log('🌐 Opening home…', STORE.baseUrl.replace('https://', 'http://'));
  try {
    await page.goto(STORE.baseUrl.replace('https://', 'http://'), { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    await page.goto(STORE.baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }
  await acceptCookies(page);
  await page.waitForTimeout(700);

  let deptQueue = await discoverDepartmentLinks(page);
  console.log('📂 Initial Departments:', deptQueue.map(d => d.name).join(', ') || '(none)');
  const seenHref = new Set(deptQueue.map(d => d.href));

  let totalProducts = 0;
  let totalOffers = 0;

  while (deptQueue.length) {
    const dept = deptQueue.shift();
    const categoryPath = dept.name;
    console.log(`\n📁 Processing: ${categoryPath} (${dept.href})`);

    try {
      await page.goto(dept.href, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.warn(`⚠️ Could not open ${dept.href}: ${e.message}`);
      continue;
    }
    await acceptCookies(page);
    await setItemsPerPage(page);

    // Log pager summary (helpful while debugging)
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerSel) {
        const summary = await page.$eval(ctx0.pagerSel, el => (el.textContent || '').trim()).catch(() => null);
        if (summary) console.log('Pager text:', summary);
      }
    } catch {}

    let pageNum = 1;

    for (;;) {
      try {
        const ctx = await getGridContext(page);
        if (!ctx?.tableSel) {
          if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
          console.log('⚠️ No product grid detected; dumped HTML for inspection.');
          break;
        }

        const items = await collectProductsOnPage(page, ctx);
        console.log(`🧾 Page ${pageNum}: found ${items.length} items`);
        if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);

        for (const p of items) {
          const sourceUrl = p.link || `${page.url()}#${normalizeName(p.name)}`;
          const ok = await upsertProductOffer(store, p, sourceUrl, categoryPath);
          if (ok) {
            totalProducts++;
            totalOffers++;
            console.log(`• ${p.name} — ${p.price}${p.unit ? ' (' + p.unit + ')' : ''}`);
          }
        }

        if (MAX_PAGES && pageNum >= MAX_PAGES) break;

        const advanced = await clickNextForThisGrid(page, ctx);
        if (!advanced) break;

        pageNum++;
      } catch (e) {
        console.error(`Error processing page ${pageNum} in ${categoryPath}:`, e.message);
        break;
      }
    }

    // Discover sub-departments after each category
    try {
      const subLinks = await discoverDepartmentLinks(page);
      for (const sub of subLinks) {
        if (!seenHref.has(sub.href) && seenHref.size < 500) {
          seenHref.add(sub.href);
          deptQueue.push(sub);
        }
      }
    } catch (e) {
      console.warn('Failed to discover sub-links for ' + categoryPath + ': ' + e.message);
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
}

/* ------------------------------ Debug helpers ------------------------------ */

async function dumpDebug(page, category, pageNum, ctx) {
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g, '_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true }).catch(() => {});
    if (ctx?.tableSel) {
      const tableHtml = await page.$eval(ctx.tableSel, n => n.outerHTML).catch(() => null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
    if (ctx?.pagerSel) {
      const pagerHtml = await page.$eval(ctx.pagerSel, n => n.outerHTML).catch(() => null);
      if (pagerHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_pager.html`), pagerHtml);
    }
  } catch {}
}

/* --------------------------------- Runner ---------------------------------- */

run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```

### scripts/scraperlatest.js
```js
/* scripts/scrape-smart.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { chromium, request } = require('playwright');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'http://www.smart.com.mt',
};

// Hardcoded top nav categories - scrape these for everything in one go per menu
const TOP_DEPARTMENTS = [
  { name: 'Baby', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-55' },
  { name: 'Bakery', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-10' },
  { name: 'Drinks', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-15' },
  { name: 'Food Cupboard', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-20' },
  { name: 'Fresh Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-25' },
  { name: 'Frozen Food', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-30' },
  { name: 'General', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-60' },
  { name: 'Health and Beauty', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-35' },
  { name: 'Home', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-40' },
  { name: 'Household', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-45' },
  { name: 'Pets', href: 'http://www.smart.com.mt/forms/Products.aspx?=10-50' },
];

/* Debug flags (handy while fixing pagination)
   Example: DRYRUN=1 CAT="Baby" MAX_PAGES=4 DEBUG_DUMP=1 CONCURRENCY=3 PAGE_DELAY=2000 HEADLESS=false node scripts/scrape-smart.js */
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const PAGE_DELAY = parseInt(process.env.PAGE_DELAY || '0', 10);
const HEADLESS = process.env.HEADLESS !== 'false';

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug');
if (DEBUG_DUMP) ensureDir(dumpDir);

/* ------------------------------ Utils ---------------------------------- */

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function parsePriceToCents(raw) {
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g, '').replace(',', '.');
  const f = parseFloat(t);
  return Number.isFinite(f) ? Math.round(f * 100) : null;
}

async function ensureStore() {
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function acceptCookies(page) {
  const candidates = [
    'text=Accept All','text=Accept all','text=Accept',
    'button:has-text("Accept")','text=I understand','text=Agree',
    '.cookie-accept','#cookie-button'
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(() => {}); break; }
    } catch {}
  }
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
}

async function httpProbe(url, proxyUrl) {
  const ctx = await request.newContext({
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  try {
    const r = await ctx.get(url, { timeout: 15000 });
    console.log('HTTP probe', url, '->', r.status());
    return r.ok();
  } catch (e) {
    console.log('HTTP probe failed:', e.message);
    return false;
  } finally {
    await ctx.dispose();
  }
}

/* ------------------------- Grid targeting --------------------------- */

async function getGridContext(page) {
  const info = await page.$$eval('table[id*="gvProducts"]', (tables) => {
    return tables.map((t) => {
      const id = t.id || '';
      const cs = getComputedStyle(t);
      const rect = t.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                      rect.width > 100 && rect.height > 100 && t.offsetParent !== null;
      const baseId = id.replace(/_DX.*$/, '');
      return { id, baseId, visible, area: rect.width * rect.height };
    });
  }).catch(() => []);
  if (!info.length) return null;
  const vis = info.filter(i => i.visible);
  const best = (vis.length ? vis : info).sort((a,b) => b.area - a.area)[0];
  const tableSel = best.id ? `#${cssEscape(best.id)}` : null;
  const pagerTopSel = `#${cssEscape(best.baseId + '_DXPagerTop')}`;
  const pagerBottomSel = `#${cssEscape(best.baseId + '_DXPagerBottom')}`;
  return { baseId: best.baseId, tableSel, pagerTopSel, pagerBottomSel };
}
function cssEscape(s) { return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1'); }

/* ---------- Fast, light “content changed” checks (avoid long waits) -------- */

async function gridSignature(page, tableSel) {
  if (!tableSel) return '';
  return await page.$eval(tableSel, t => (t.innerText || '').trim());
}
async function waitGridChanged(page, tableSel, oldSig, timeout = 60000) {
  if (!tableSel) return false;
  return await page.waitForFunction((sel, prev) => {
    const t = document.querySelector(sel);
    if (!t) return false;
    const sig = (t.innerText || '').trim();
    return sig && sig !== prev;
  }, tableSel, oldSig, { timeout }).then(() => true).catch(() => false);
}

async function readPagerInfo(page, pagerSel) {
  const curFromSpan = await page.$eval(pagerSel, root => {
    const cur = root.querySelector('span.dxp-current, [aria-current="page"]');
    return cur ? (cur.textContent || '').trim() : '';
  }).catch(() => '');
  let cur = parseInt(curFromSpan, 10);
  if (!Number.isFinite(cur)) {
    const summary = await page.$eval(pagerSel, root => {
      const s = root.querySelector('.dxp-summary, .dxp-lead');
      return s ? (s.textContent || '').trim() : '';
    }).catch(() => '');
    const m = /Page\s+(\d+)\s+of\s+(\d+)/i.exec(summary);
    if (m) cur = parseInt(m[1], 10);
  }
  const totalTxt = await page.$eval(pagerSel, root => {
    const s = root.querySelector('.dxp-summary, .dxp-lead');
    return s ? (s.textContent || '').trim() : '';
  }).catch(() => '');
  const m2 = /Page\s+\d+\s+of\s+(\d+)/i.exec(totalTxt);
  const total = m2 ? parseInt(m2[1], 10) : null;
  return { cur: Number.isFinite(cur) ? cur : null, total };
}

async function waitPagerIncrement(page, pagerSel, prev, timeout = 60000) {
  if (prev == null) return false;
  return await page.waitForFunction((sel, p) => {
    const r = document.querySelector(sel);
    if (!r) return false;
    const curEl = r.querySelector('span.dxp-current, [aria-current="page"]');
    if (curEl) {
      const n = parseInt((curEl.textContent || '').trim(), 10);
      return Number.isFinite(n) && n > p;
    }
    const sEl = r.querySelector('.dxp-summary, .dxp-lead');
    if (sEl) {
      const m = /Page\s+(\d+)\s+of\s+\d+/.exec(sEl.textContent || '');
      if (m) {
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) && n > p;
      }
    }
    return false;
  }, pagerSel, prev, { timeout }).then(() => true).catch(() => false);
}

/* ----------------------- Pager interaction (hybrid click + JS) -------------------- */

async function goNextPage(page, ctx) {
  if (!ctx) return false;
  const { baseId, tableSel, pagerTopSel, pagerBottomSel } = ctx;
  let { cur, total } = await readPagerInfo(page, pagerTopSel);
  if (cur == null) ({ cur, total } = await readPagerInfo(page, pagerBottomSel));
  if (cur == null) { console.log('Pager: cannot read current page'); return false; }
  const beforeSig = await gridSignature(page, tableSel);
  const t0 = Date.now();
  // Try click first
  let advanced = false;
  const nextSel = `${pagerTopSel} a.dxp-button.dxp-bt, ${pagerBottomSel} a.dxp-button.dxp-bt, ${pagerTopSel} a[onclick*="PBN"], ${pagerBottomSel} a[onclick*="PBN"], ${pagerTopSel} img[alt="Next"], ${pagerBottomSel} img[alt="Next"], a[title="Next"], a:has-text(">") , .next-page`;
  await page.waitForSelector(nextSel, { state: 'attached' }).catch(() => {});  // Wait for attachment
  const nextEl = await page.$(nextSel).catch(() => null);
  if (nextEl && cur < total) {  // Only proceed if not at last page
    console.log('Found next button with selector; attempting click...');
    await nextEl.click({ force: true }).catch(e => console.log('Click failed:', e.message));
    await page.waitForLoadState('networkidle').catch(() => {});
    advanced = await waitGridChanged(page, tableSel, beforeSig, 60000);
  }
  // Fallback to JS callback if click didn't advance
  if (!advanced && cur < total) {
    console.log('Click did not advance; falling back to JS callback for next page...');
    const token = `__dx_end_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fired = await page.evaluate(({ gridId, token }) => {
      const getClient = () => {
        const direct = window[gridId];
        if (direct) return direct;
        try {
          if (window.ASPx && ASPx.GetControlCollection) {
            return ASPx.GetControlCollection().GetByName(gridId) || null;
          }
        } catch {}
        return null;
      };
      const gv = getClient();
      if (!gv) return { ok: false, why: 'no client object' };
      const handler = function onEnd() {
        try { gv.EndCallback && gv.EndCallback.RemoveHandler(onEnd); } catch {}
        window[token] = 'done';
      };
      try {
        if (gv.EndCallback && gv.EndCallback.AddHandler) gv.EndCallback.AddHandler(handler);
      } catch {}
      try {
        if (typeof gv.PerformCallback === 'function') {
          gv.PerformCallback('PBN');  // PBN for Page Next
        } else if (typeof window.aspxGVPagerOnClick === 'function') {
          window.aspxGVPagerOnClick(gridId, 'PBN');
        } else {
          return { ok: false, why: 'no pager method' };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, why: String(e) };
      }
    }, { gridId: baseId, token });
    if (fired.ok) {
      const endHit = await page.waitForFunction(tok => window[tok] === 'done', token, { timeout: 60000 }).then(() => true).catch(() => false);
      advanced = endHit || await waitGridChanged(page, tableSel, beforeSig, 60000);
    } else {
      console.log('JS callback failed:', fired.why);
    }
  }
  const timeTaken = Date.now() - t0;
  console.log(`Pager flip ${advanced ? 'OK' : 'FAILED'} in ${timeTaken}ms (from ${cur} -> ${cur + 1})`);
  if (PAGE_DELAY) await page.waitForTimeout(PAGE_DELAY);
  return advanced && cur < total;  // Stop if at last page
}

/* --------------------------- Discovery / parse --------------------------- */

async function discoverDepartmentLinks(page) {
  const anchors = await page.$$eval('a', as => as.map(a => ({
    text: (a.textContent || '').trim(), href: a.href
  })).filter(x => x.href && x.href.startsWith('http')));
  const nameSet = new Set(TOP_DEPARTMENTS.map(d => d.name.toLowerCase()));
  const links = anchors.filter(a => {
    const t = normalizeName(a.text);
    const isDeptText = nameSet.has(t);
    const looksLikeCat = /(category|categories|department|products|departmentid|cat|dept|groceries)/i.test(a.href) || /Products\.aspx/i.test(a.href);
    return isDeptText || looksLikeCat;
  });
  const seen = new Set();
  const cleaned = [];
  for (const l of links) {
    try {
      const u = new URL(l.href);
      const key = u.origin + u.pathname + u.search;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({
          name: l.text || u.search.slice(1) || u.pathname.split('/').filter(Boolean).pop() || 'Department',
          href: u.toString().replace('https://', 'http://'),
        });
      }
    } catch {}
  }
  const filtered = cleaned.filter(l => !/(account|login|cart|checkout|about|contact)/i.test(l.href));
  const uniq = [];
  const seenHref = new Set();
  for (const l of filtered) {
    if (!seenHref.has(l.href)) { uniq.push(l); seenHref.add(l.href); }
  }
  const strong = uniq.filter(l => /(department|category|products)/i.test(l.href));
  const final = strong.length ? strong : uniq;
  return final
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER))
    .slice(0, 80);
}

async function setItemsPerPage(page) {
  const candidates = [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ];
  for (const sel of candidates) {
    const el = await page.$(sel).catch(() => null);
    if (!el) continue;
    const ctxBefore = await getGridContext(page);
    const sigBefore = ctxBefore?.tableSel ? await gridSignature(page, ctxBefore.tableSel) : '';
    try {
      const picked = await page.$eval(sel, node => {
        const opts = Array.from(node.options || []);
        const values = opts.map(o => parseInt(o.value, 10)).filter(Number.isFinite);
        if (!values.length) return { success: false, max: 0 };
        const max = Math.max(...values);
        const opt = opts.find(o => parseInt(o.value, 10) === max);
        if (!opt) return { success: false, max: 0 };
        node.value = opt.value;
        return { success: true, max };
      }).catch(() => ({ success: false, max: 0 }));
      if (!picked.success) continue;
      console.log(`Set items per page to max: ${picked.max}`);
      const onchange = await el.getAttribute('onchange').catch(() => null);
      if (onchange && /__doPostBack/.test(onchange)) {
        await page.evaluate((sel) => {
          const node = document.querySelector(sel);
          if (!node) return;
          if (typeof window.__doPostBack === 'function') {
            const name = node.name || node.id || '';
            window.__doPostBack(name, '');
          } else {
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, sel);
      } else {
        await page.selectOption(sel, { value: String(picked.max) }).catch(() => {});
      }
      const ctxAfter = await getGridContext(page);
      const selAfter = ctxAfter?.tableSel || ctxBefore?.tableSel;
      const changed = await waitGridChanged(page, selAfter, sigBefore, 60000);
      if (changed) {
        return true;
      }
    } catch {}
  }
  return false;
}

async function collectProductsOnPage(page, ctx) {
  if (!ctx?.tableSel) return [];
  const products = await page.$eval(ctx.tableSel, (table) => {
    const visible = (el) => el && el.offsetParent !== null;
    const stripScripts = (root) => {
      root.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return root;
    };
    const textFrom = (el) => {
      const clone = el.cloneNode(true);
      stripScripts(clone);
      return (clone.innerText || '').replace(/\s+/g, ' ').trim();
    };
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return [];
    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);
    const out = [];
    for (const row of dataRows) {
      if (!visible(row)) continue;
      const tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 2) continue;
      const rowText = textFrom(row);
      if (!/€\s*\d/.test(rowText)) continue;
      const imgEl = row.querySelector('img');
      const imgAlt = imgEl?.getAttribute('alt')?.trim() || '';
      let name = '';
      const nameCandidates = Array.from(row.querySelectorAll('td a, td span, td div'))
        .filter((n) =>
          visible(n) &&
          !n.querySelector('img') &&
          !/add|basket|cart|button|qty|quantity/i.test(n.className || '') &&
          (n.innerText || '').trim().length > 1
        )
        .map((n) => (n.innerText || '').trim());
      name = nameCandidates.find((t) => !/€\s*\d/.test(t)) || imgAlt;
      if (!name) {
        name = rowText.replace(/€\s*\d[\d\.,]*/g, '').trim();
        if (name.length > 120) name = name.slice(0, 120);
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name || name === 'Items per page:') continue;
      let priceStr = '';
      const tdTexts = tds.map((td) => textFrom(td));
      for (const tx of tdTexts) {
        const m = tx.match(/€\s*\d[\d\.,]*/);
        if (m) { priceStr = m[0]; break; }
      }
      if (!priceStr) continue;
      let unit = '';
      const unitEl = row.querySelector('small, .unit, .size');
      if (unitEl) unit = (unitEl.innerText || '').trim();
      if (!unit) {
        const m = rowText.match(/(?:per|\/)\s*[A-Za-z]+|[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets)/i);
        if (m) unit = m[0].trim();
      }
      if (/items per page/i.test(unit)) unit = '';
      let link = '';
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      link = linkEl?.href || '';
      const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset') || '';
      const brand = (name.split(/\s+/).find((w) => !/\d/.test(w)) || '') || '';
      out.push({ name, price: priceStr, unit, link, image, brand });
    }
    return out;
  });
  console.log(`Parsed ${products.length} product rows`);
  return products;
}

/* ------------------------------- DB upsert -------------------------------- */

async function batchUpsertProductsAndOffers(store, items, categoryPath, pageUrl, isDryRun) {
  if (isDryRun) {
    items.forEach(p => console.log(`[DRYRUN] ${categoryPath} :: ${p.name} — ${p.price} ${p.unit || ''}`));
    return items.length;
  }
  const productData = items.map(p => ({
    name: p.name,
    brand: p.brand || null,
    imageUrl: p.image || null,
    nameNormalized: normalizeName(p.name),
    storeId: store.id,
    sourceUrl: p.link || `${pageUrl}#${normalizeName(p.name)}`,
  }));
  const products = await Promise.all(productData.map(data => 
    prisma.priceProduct.upsert({
      where: { sourceUrl: data.sourceUrl },
      update: data,
      create: data,
    })
  ));
  const offerData = products.map((prod, i) => ({
    productId: prod.id,
    priceCents: parsePriceToCents(items[i].price),
    unit: items[i].unit || null,
    category: categoryPath || null,
  }));
  const validOffers = offerData.filter(o => o.priceCents != null);
  if (validOffers.length) {
    await prisma.priceOffer.createMany({ data: validOffers });
  }
  return validOffers.length;
}

/* --------------------------------- Main ----------------------------------- */

async function createContext(browser, proxyUrl) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HouseflowScraper/1.0 Chrome/120 Safari/537.36',
    ignoreHTTPSErrors: true,
    ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
  });
  await context.route('**/*', (route) => {
    const r = route.request();
    const type = r.resourceType();
    const url = r.url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      /\.woff2?$|\.ttf$|\.otf$|\.png$|\.jpe?g$|\.gif$|\.webp$|\.mp4$|\.avi$/i.test(url) ||
      /google-analytics\.com|gtag\/js|googletagmanager\.com|facebook\.com\/tr|hotjar\.com|doubleclick\.net/i.test(url)
    ) return route.abort();
    return route.continue();
  });
  return context;
}

// Use hardcoded tops, filter by CAT
const allDepts = CAT_FILTER ? TOP_DEPARTMENTS.filter(d => normalizeName(d.name).includes(CAT_FILTER)) : TOP_DEPARTMENTS;

async function scrapeDepartment(dept, store, browser, proxyUrl, isDryRun) {
  const context = await createContext(browser, proxyUrl);
  const page = await context.newPage();
  try {
    const categoryPath = dept.name;
    console.log(`\n📁 [Parallel] Processing: ${categoryPath} (${dept.href})`);
    const deptStart = Date.now();
    await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await acceptCookies(page);
    await setItemsPerPage(page);
    try {
      const ctx0 = await getGridContext(page);
      if (ctx0?.pagerTopSel || ctx0?.pagerBottomSel) {
        const sel = (ctx0.pagerTopSel || '') + (ctx0.pagerBottomSel ? `, ${ctx0.pagerBottomSel}` : '');
        const summary = await page.$eval(sel, el => (el.textContent || '').trim()).catch(() => null);
        if (summary) console.log('Pager text:', summary);
      }
    } catch {}
    let pageNum = 1;
    let deptProducts = 0;
    let deptOffers = 0;
    for (;;) {
      const pageStart = Date.now();
      const ctx = await getGridContext(page);
      if (!ctx?.tableSel) {
        if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
        console.log('⚠️ No product grid detected; dumped HTML for inspection.');
        break;
      }
      const items = await collectProductsOnPage(page, ctx);
      console.log(`🧾 [${categoryPath}] Page ${pageNum}: found ${items.length} items (took ${(Date.now() - pageStart)/1000}s)`);
      if (DEBUG_DUMP) await dumpDebug(page, categoryPath, pageNum, ctx);
      const processed = await batchUpsertProductsAndOffers(store, items, categoryPath, page.url(), isDryRun);
      deptProducts += items.length;
      deptOffers += processed;
      if (MAX_PAGES && pageNum >= MAX_PAGES) break;
      const advanced = await goNextPage(page, ctx);
      if (!advanced) break;
      pageNum++;
    }
    console.log(`Finished ${categoryPath} in ${(Date.now() - deptStart)/1000/60} min (products: ${deptProducts}, offers: ${deptOffers})`);
    return { products: deptProducts, offers: deptOffers };
  } finally {
    await context.close();
  }
}

async function run() {
  console.log('▶️ Starting Smart scraper…');
  if (!process.env.DATABASE_URL && !process.env.DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for no-DB test)');
  }
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const reachable = await httpProbe(STORE.baseUrl, proxyUrl);  // Probe HTTP
  if (!reachable) {
    console.error('❌ Not reachable. Fix proxy/DNS or run from a VM that can reach the site.');
    return;
  }
  const store = await ensureStore();
  const browser = await chromium.launch({ headless: HEADLESS });
  const isDryRun = !!process.env.DRYRUN;
  try {
    let totalProducts = 0;
    let totalOffers = 0;
    // Parallel scrape depts in batches
    for (let i = 0; i < allDepts.length; i += CONCURRENCY) {
      const batch = allDepts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(dept => scrapeDepartment(dept, store, browser, proxyUrl, isDryRun)));
      results.forEach(res => {
        totalProducts += res.products;
        totalOffers += res.offers;
      });
    }
    console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
  } finally {
    await browser.close();
  }
}

/* ------------------------------ Debug helpers ------------------------------ */
async function dumpDebug(page, category, pageNum, ctx) {
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g, '_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true }).catch(() => {});
    if (ctx?.tableSel) {
      const tableHtml = await page.$eval(ctx.tableSel, n => n.outerHTML).catch(() => null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
    if (ctx?.pagerTopSel || ctx?.pagerBottomSel) {
      const sel = (ctx.pagerTopSel || '') + (ctx.pagerBottomSel ? `, ${ctx.pagerBottomSel}` : '');
      const pagerHtml = await page.$eval(sel, n => n.outerHTML).catch(() => null);
      if (pagerHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_pager.html`), pagerHtml);
    }
  } catch {}
}

/* --------------------------------- Runner ---------------------------------- */
run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### scripts/smart-puppeteer.js
```js
/* scripts/smart-puppeteer.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { prisma } = require('./prisma');

const STORE = {
  name: 'Smart Supermarket',
  domain: 'www.smart.com.mt',
  baseUrl: 'http://www.smart.com.mt',
};

/* ─── Flags ────────────────────────────────────────────────────────────────
   Examples:
   DRYRUN=1 CAT="Baby" MAX_PAGES=4 HEADFUL=1 DEBUG_DUMP=1 node scripts/smart-puppeteer.js
---------------------------------------------------------------------------*/
const CAT_FILTER = (process.env.CAT || '').toLowerCase().trim();
const MAX_PAGES  = parseInt(process.env.MAX_PAGES || '0', 10) || 0;
const DEBUG_DUMP = !!process.env.DEBUG_DUMP;
const DRYRUN     = !!process.env.DRYRUN;
const HEADFUL    = !!process.env.HEADFUL;

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
const dumpDir = path.join(process.cwd(), 'smart_debug'); if (DEBUG_DUMP) ensureDir(dumpDir);

/* ─── Utils ───────────────────────────────────────────────────────────────*/
function normalizeName(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function parsePriceToCents(raw){
  if (!raw) return null;
  const t = String(raw).replace(/[€\s]/g,'').replace(',', '.');
  const f = parseFloat(t); return Number.isFinite(f) ? Math.round(f*100) : null;
}
function cssEscape(s){ return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,'\\$1'); }

async function ensureStore(){
  return prisma.store.upsert({
    where: { domain: STORE.domain },
    update: { name: STORE.name },
    create: { name: STORE.name, domain: STORE.domain },
  });
}

async function upsertProductOffer(store, p, sourceUrl, category){
  const cents = parsePriceToCents(p.price);
  if (cents == null) return false;
  if (DRYRUN) { console.log(`[DRYRUN] ${category} :: ${p.name} — ${p.price} ${p.unit||''}`); return true; }

  const product = await prisma.priceProduct.upsert({
    where: { sourceUrl },
    update: {
      name: p.name,
      brand: p.brand || null,
      imageUrl: p.image || null,
      nameNormalized: normalizeName(p.name),
      storeId: store.id,
    },
    create: {
      storeId: store.id,
      name: p.name,
      brand: p.brand || null,
      sourceUrl,
      imageUrl: p.image || null,
      nameNormalized: normalizeName(p.name),
    },
  });

  await prisma.priceOffer.create({
    data: {
      productId: product.id,
      priceCents: cents,
      unit: p.unit || null,
      category: category || null,
    },
  });
  return true;
}

/* ─── Page helpers ───────────────────────────────────────────────────────*/
async function acceptCookies(page){
  for (const sel of [
    'text/Accept All/i','text/Accept all/i','text/Accept/i',
    'button:has-text("Accept")','.cookie-accept','#cookie-button',
    'text/I understand/i','text/Agree/i'
  ]) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click().catch(()=>{}); await page.waitForTimeout(150); break; }
    } catch {}
  }
}

async function setupBlocking(page){
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    const url = req.url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      /\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|mp4|avi)$/i.test(url) ||
      /google-analytics\.com|googletagmanager\.com|doubleclick\.net|facebook\.com\/tr|hotjar\.com/i.test(url)
    ) return req.abort();
    req.continue();
  });
}

async function discoverTopNav(page){
  // collect top nav “Products.aspx” links
  const links = await page.$$eval('a', as => as
    .map(a => ({ text: (a.textContent||'').trim(), href: a.href }))
    .filter(x => x.href && /Products\.aspx/i.test(x.href)));
  const seen = new Set(), out = [];
  for (const a of links){
    try {
      const u = new URL(a.href); const key = u.origin+u.pathname+u.search;
      if (!seen.has(key)) { seen.add(key); out.push({ name: a.text || 'Category', href: u.toString() }); }
    } catch {}
  }
  return out
    .filter(d => !/(account|login|cart|checkout|about|contact)/i.test(d.href))
    .filter(d => !CAT_FILTER || normalizeName(d.name).includes(CAT_FILTER));
}

async function waitGridReady(page){
  // Wait for a DevExpress grid main table to appear and its client object to exist
  const mainTableHandle = await page.waitForSelector('table[id$="_DXMainTable"]', { timeout: 10000 }).catch(()=>null);
  if (!mainTableHandle) return null;
  const mainId = await page.evaluate(n => n.id, mainTableHandle);
  const baseId = mainId.replace(/_DX.*$/, '');

  const ok = await page.waitForFunction((gridId) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    return !!getClient();
  }, baseId, { timeout: 10000 }).then(()=>true).catch(()=>false);

  if (!ok) return null;
  return { baseId, mainSel: `#${cssEscape(mainId)}` };
}

async function setItemsPerPage50(page){
  for (const sel of [
    'select#ItemsPerPage','select[name="itemsPerPage"]','select:has(option[value="50"])',
    'select:has(option:has-text("50"))','select#perPage','select[name="perpage"]',
    'select[name="pagesize"]','select[id*="ddlPageSize"]','select[id*="$ddlPageSize"]',
  ]) {
    const el = await page.$(sel).catch(()=>null);
    if (!el) continue;
    const before = (await page.content()).slice(0, 2000);
    try {
      await el.select('50').catch(()=>{});
      await page.select(sel, '50').catch(()=>{});
    } catch {}
    try {
      await page.waitForFunction(prev => document.body && document.body.innerText !== prev, before, { timeout: 2500 });
    } catch {}
    return true;
  }
  return false;
}

/* Parse current grid page (DOM) */
async function collectProductsOnPage(page, mainSel){
  const items = await page.$eval(mainSel, (table) => {
    const out = [];
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return out;

    const dataRows = rows.slice(1, rows.length > 1 ? -1 : rows.length);
    const isVisible = (el) => el && el.offsetParent !== null;

    const textize = (el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
      return (clone.innerText || '').replace(/\s+/g,' ').trim();
    };

    for (const row of dataRows){
      if (!isVisible(row)) continue;
      const rowText = textize(row);
      if (!/€\s*\d/.test(rowText)) continue;

      // prefer link text for name
      const nameLink = row.querySelector('td a');
      let name = (nameLink?.innerText || '').trim();
      if (!name) {
        const tds = Array.from(row.querySelectorAll('td')).map(textize);
        name = tds.find(t => t && !/€\s*\d/.test(t)) || '';
      }
      name = name.replace(/Special Offer:.*/i, '').trim();
      if (!name) continue;

      // price
      const priceMatch = rowText.match(/€\s*\d[\d\.,]*/);
      if (!priceMatch) continue;
      const price = priceMatch[0];

      // unit
      let unit = '';
      const m = rowText.match(/(?:\b[0-9]+(?:\.[0-9]+)?\s*(?:g|kg|l|ml|cl|pcs|tabs|caps|sachets|L|G)\b|\bper\s+[A-Za-z]+\b)/i);
      if (m) unit = m[0];

      // link + image
      const linkEl = row.querySelector('a[href*="ProductDetails"], a[href*="product"], a[href*="pid="]');
      const link = linkEl ? linkEl.href : '';
      const imgEl  = row.querySelector('img');
      const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('srcset') || '';

      const brand = (name.split(/\s+/).find(w => !/\d/.test(w)) || '') || '';
      out.push({ name, price, unit, link, image, brand });
    }
    return out;
  }).catch(()=>[]);
  return items;
}

/* DevExpress fast pager using client API */
async function goNextPage(page, baseId){
  const info = await page.evaluate((gridId) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return { ok:false };
    const idx = typeof gv.GetPageIndex === 'function' ? gv.GetPageIndex() : null;
    const cnt = typeof gv.GetPageCount === 'function' ? gv.GetPageCount() : null;
    return { ok:true, idx, cnt };
  }, baseId);
  if (!info.ok || info.idx == null) return false;
  if (typeof info.cnt === 'number' && info.idx+1 >= info.cnt) return false;

  const target = info.idx + 1;

  // fire and wait for target index
  const fired = await page.evaluate((gridId, targetIdx) => {
    const getClient = () => {
      const direct = window[gridId]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(gridId) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return false;
    try {
      if (typeof gv.GotoPage === 'function') { gv.GotoPage(targetIdx); return true; }
      if (typeof gv.PerformCallback === 'function') { gv.PerformCallback('PN'+targetIdx); return true; }
      if (typeof window.aspxGVPagerOnClick === 'function') { window.aspxGVPagerOnClick(gridId, 'PN'+targetIdx); return true; }
    } catch {}
    return false;
  }, baseId, target);
  if (!fired) return false;

  // wait until the client index equals target
  const ok = await page.waitForFunction(({ id, target }) => {
    const getClient = () => {
      const direct = window[id]; if (direct) return direct;
      try { if (window.ASPx && ASPx.GetControlCollection) return ASPx.GetControlCollection().GetByName(id) || null; } catch {}
      return null;
    };
    const gv = getClient(); if (!gv) return false;
    if (typeof gv.InCallback === 'function' && gv.InCallback()) return false;
    return typeof gv.GetPageIndex === 'function' && gv.GetPageIndex() === target;
  }, { id: baseId, target }, { timeout: 2500 }).then(()=>true).catch(()=>false);

  return ok;
}

/* Debug dump */
async function dump(page, category, pageNum, mainSel){
  if (!DEBUG_DUMP) return;
  try {
    const safe = category.replace(/\W+/g,'_');
    const html = await page.content();
    fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}.html`), html);
    await page.screenshot({ path: path.join(dumpDir, `cat_${safe}_p${pageNum}.png`), fullPage: true });
    if (mainSel){
      const tableHtml = await page.$eval(mainSel, n => n.outerHTML).catch(()=>null);
      if (tableHtml) fs.writeFileSync(path.join(dumpDir, `cat_${safe}_p${pageNum}_table.html`), tableHtml);
    }
  } catch {}
}

/* ─── Main ────────────────────────────────────────────────────────────────*/
async function run(){
  console.log('▶️ Starting Smart Puppeteer scraper…');
  if (!process.env.DATABASE_URL && !DRYRUN) {
    throw new Error('DATABASE_URL not set (or set DRYRUN=1 for a no-DB test)');
  }
  const store = await ensureStore();

  const browser = await puppeteer.launch({
    headless: !HEADFUL,
    args: ['--no-sandbox','--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  await setupBlocking(page);

  await page.goto(STORE.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);

  const depts = (await discoverTopNav(page)).slice(0, 80);
  console.log('📂 Departments:', depts.map(d => d.name).join(', ') || '(none)');

  let totalProducts = 0, totalOffers = 0;

  for (const dept of depts){
    console.log(`\n📁 Processing: ${dept.name} (${dept.href})`);
    await page.goto(dept.href, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
    await acceptCookies(page);
    await setItemsPerPage50(page).catch(()=>{});

    const grid = await waitGridReady(page);
    if (!grid) { console.log('⚠️ Grid not ready; skipping.'); continue; }
    const { baseId, mainSel } = grid;

    let pageNum = 1;
    for (;;){
      // Wait until the table has a Euro price (content mounted)
      try {
        await page.waitForFunction((sel) => {
          const t = document.querySelector(sel); if (!t) return false;
          const txt = (t.innerText||'').slice(0, 2000);
          return /€\s*\d/.test(txt);
        }, mainSel, { timeout: 4000 });
      } catch {}

      const items = await collectProductsOnPage(page, mainSel);
      console.log(`🧾 Page ${pageNum}: ${items.length} items`);
      if (DEBUG_DUMP) await dump(page, dept.name, pageNum, mainSel);

      for (const p of items){
        const sourceUrl = p.link || `${page.url()}#${normalizeName(p.name)}`;
        const ok = await upsertProductOffer(store, p, sourceUrl, dept.name);
        if (ok) { totalProducts++; totalOffers++; }
      }

      if (MAX_PAGES && pageNum >= MAX_PAGES) break;

      const advanced = await goNextPage(page, baseId);
      if (!advanced) break;

      pageNum++;
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Upserted ~${totalProducts} products, inserted ${totalOffers} offers.`);
}

run()
  .catch(async (e) => {
    console.error('❌ Scraper failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```

## 9. Build & Run
- Dev: npm run dev
- Build: npm run build → Start: npm start (or CapRover)
- Node: from .nvmrc if present

## 10. Deployment
- CapRover app, image, domain, envs
- Prisma generate on build

## 11. Known Issues / TODO
- Fill as needed

## 12. Appendix — package.json

### package.json
```json
{
  "name": "houseflow",
  "version": "0.1.0",
  "private": true,
  "prisma": {
    "schema": "prisma/schema.prisma"
  },
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "start": "next start",
    "lint": "next lint",
    "scrape:smart": "node scripts/scrape-smart.js",
    "scrape:smart:headed": "node scripts/scrape-smart.js headed"
  },
  "dependencies": {
    "@prisma/client": "^6.15.0",
    "bcryptjs": "^3.0.2",
    "cuid": "^3.0.0",
    "next": "^14.2.5",
    "next-auth": "^4.24.7",
    "puppeteer": "^24.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "resend": "^6.0.1",
    "swr": "^2.3.6"
  },
  "devDependencies": {
    "@types/node": "^20.4.0",
    "@types/react": "18.2.0",
    "autoprefixer": "^10.4.21",
    "eslint": "8.40.0",
    "eslint-config-next": "14.0.4",
    "globby": "^14.1.0",
    "playwright": "^1.55.0",
    "postcss": "^8.5.6",
    "pretty-bytes": "^7.0.1",
    "prisma": "^6.15.0",
    "tailwindcss": "^3.4.17",
    "ts-node": "^10.9.2",
    "typescript": "^5.2.2"
  }
}

```
