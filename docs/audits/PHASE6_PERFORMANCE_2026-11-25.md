# Phase 6 performance evidence — 2026-11-25

Historical audit, not a new budget or release authorization. Worker 4. This records retrieved hosted lab evidence, including rejected experiments; exact integrated-main ledger after #760 and #817 is a separate pending qualification. No field p75, INP, deployment, or SLA claim.

## Measurement method

Slow-4G lab: fresh Chromium contexts, 150 ms latency, 200,000 B/s download and 93,750 B/s upload, 1440×900 desktop CPU 1× and 390×844 phone CPU 4×. Five samples per scenario where recorded. Selected interaction is a lab event measurement, not field INP. `—` means unavailable, not zero. Browser Resource Timing transferred JS (pre-input, including transfer overhead) is not the signed-out HTTP lane's compressed entity bytes; do not combine the two. Different exact heads and fixtures are not matched experiments. Existing lane assertions and budgets remain unchanged.

## Recorded lab medians

All parseable baseline and independent Landing interaction JSON rows from the identified evidence jobs below. Values in the table are emitted medians, not estimates. Historical rejected branches are intentionally included.

| Job | Source SHA | Width / route | LCP ms | CLS | Interaction ms | Cold JS B |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| [139421627602](https://github.com/faresmohamed260/renderlab/actions/jobs/139421627602) | `ffa8fd26d59eeb3b279eec410692e9f775025be8` | 1440 / /create | 884 | 0.0008462280189713006 | 32 | 237382 |
| [139421627602](https://github.com/faresmohamed260/renderlab/actions/jobs/139421627602) | `ffa8fd26d59eeb3b279eec410692e9f775025be8` | 1440 / /library | 852 | 0.00034858669704861117 | 80 | 234010 |
| [139421627602](https://github.com/faresmohamed260/renderlab/actions/jobs/139421627602) | `ffa8fd26d59eeb3b279eec410692e9f775025be8` | 390 / /create | 868 | 0.0005680422428496722 | 56 | 237382 |
| [139421627602](https://github.com/faresmohamed260/renderlab/actions/jobs/139421627602) | `ffa8fd26d59eeb3b279eec410692e9f775025be8` | 390 / /library | 868 | 0.00045255355942658005 | 120 | 234010 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 1440 / /create | 900 | 0.11244625955798826 | 40 | 237169 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 1440 / /library | 868 | 0.00034858669704861117 | 96 | 234010 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 1440 / / | 980 | 0.0006331134058320474 | — | 290029 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 390 / /create | 884 | 0.0005680422428496722 | 56 | 237169 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 390 / /library | 888 | 0.00045255355942658005 | 144 | 234010 |
| [139437291311](https://github.com/faresmohamed260/renderlab/actions/jobs/139437291311) | `eeed240baffc3f8a75c0f6d88abe1da59517f8bd` | 390 / / | 960 | 0.0010274332960274006 | — | 290029 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 1440 / /create | 916 | 0.11244625955798826 | 48 | 237160 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 1440 / /library | 904 | 0.00034858669704861117 | 112 | 233427 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 1440 / / | 1032 | 0.0006331134058320474 | — | 290020 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 390 / /create | 904 | 0.0005680422428496722 | 72 | 237160 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 390 / /library | 908 | 0.00045255355942658005 | 160 | 233427 |
| [139442219306](https://github.com/faresmohamed260/renderlab/actions/jobs/139442219306) | `5a1c680408b93b8585a9a4173ad943e355325644` | 390 / / | 1004 | 0.0010274332960274006 | — | 290020 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 1440 / /create | 940 | 0.0018036697199315201 | 48 | 237689 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 1440 / /library | 892 | 0.00034858669704861117 | 104 | 234932 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 1440 / / | 1024 | 0.0006331134058320474 | — | 290549 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 390 / /create | 892 | 0.0005680422428496722 | 72 | 237689 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 390 / /library | 860 | 0.0010363896985519368 | 144 | 234932 |
| [139473792703](https://github.com/faresmohamed260/renderlab/actions/jobs/139473792703) | `533b433d540bdf26480474b8a19c1461476edd8e` | 390 / / | 1000 | 0.0010274332960274006 | — | 290549 |
| [139473618766](https://github.com/faresmohamed260/renderlab/actions/jobs/139473618766) | `131bb3a0658d00f4cf6bf2d05367c30e2e5a3687` | 1440 / /create | 936 | 0.0018036697199315201 | 48 | 237689 |
| [139473618766](https://github.com/faresmohamed260/renderlab/actions/jobs/139473618766) | `131bb3a0658d00f4cf6bf2d05367c30e2e5a3687` | 1440 / /library | 888 | 0.00034858669704861117 | 104 | 234932 |
| [139473618766](https://github.com/faresmohamed260/renderlab/actions/jobs/139473618766) | `131bb3a0658d00f4cf6bf2d05367c30e2e5a3687` | 390 / /create | 892 | 0.0005680422428496722 | 72 | 237689 |
| [139473618766](https://github.com/faresmohamed260/renderlab/actions/jobs/139473618766) | `131bb3a0658d00f4cf6bf2d05367c30e2e5a3687` | 390 / /library | 856 | 0.0010363896985519368 | 144 | 234932 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 1440 / /create | 944 | 0.0008462280189713006 | 48 | 237689 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 1440 / /library | 888 | 0.00034858669704861117 | 120 | 234932 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 1440 / / | 1008 | 0.0006331134058320474 | — | 290549 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 390 / /create | 896 | 0.0005680422428496722 | 72 | 237689 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 390 / /library | 872 | 0.0010363896985519368 | 152 | 234932 |
| [139473865153](https://github.com/faresmohamed260/renderlab/actions/jobs/139473865153) | `04cdad4ad0393c5ca337359343dafd26472e6962` | 390 / / | 996 | 0.0010274332960274006 | — | 290549 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 1440 / /create | 888 | 0.0008462280189713006 | 32 | 237689 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 1440 / /library | 860 | 0.00034858669704861117 | 80 | 234932 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 1440 / / | 944 | 0.0006331134058320474 | — | 290549 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 390 / /create | 864 | 0.0005680422428496722 | 56 | 237689 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 390 / /library | 844 | 0.001997258640261381 | 112 | 234932 |
| [139480874930](https://github.com/faresmohamed260/renderlab/actions/jobs/139480874930) | `4ea8873d5438e01e15e68ad8621a8ce867847bb7` | 390 / / | 944 | 0.0010274332960274006 | — | 290549 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 1440 / /create | 912 | 0.0008462280189713006 | 40 | 237689 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 1440 / /library | 864 | 0.00034858669704861117 | 88 | 234932 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 1440 / / | 972 | 0.0006331134058320474 | — | 290549 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 390 / /create | 880 | 0.0005680422428496722 | 56 | 237689 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 390 / /library | 852 | 0.001997258640261381 | 120 | 234932 |
| [139487865729](https://github.com/faresmohamed260/renderlab/actions/jobs/139487865729) | `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e` | 390 / / | 956 | 0.0010274332960274006 | — | 290549 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 1440 / /create | 944 | 0.0018036697199315201 | 48 | 237689 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 1440 / /library | 888 | 0.00034858669704861117 | 104 | 234932 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 1440 / / | 1020 | 0.0006331134058320474 | — | 290549 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 390 / /create | 892 | 0.0005680422428496722 | 72 | 237689 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 390 / /library | 864 | 0.0010363896985519368 | 144 | 234932 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 390 / / | 1004 | 0.0010274332960274006 | — | 290549 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 1440 / /create | 1120 | 0.0008462280189713006 | 40 | 246060 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 1440 / /library | 1060 | 0.00034858669704861117 | 96 | 244518 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 1440 / / | 1200 | 0.0006331134058320474 | — | 280580 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 390 / /create | 1092 | 0.0005680422428496722 | 64 | 246060 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 390 / /library | 1044 | 0.0010363896985519368 | 144 | 244518 |
| [139493281845](https://github.com/faresmohamed260/renderlab/actions/jobs/139493281845) | `c822591cbdeea68378ba44df5f1070f11bb3b1dc` | 390 / / | 1208 | 0.0010274332960274006 | — | 280580 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 1440 / /create | 944 | 0.0008462280189713006 | 48 | 244042 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 1440 / /library | 892 | 0.00034858669704861117 | 104 | 234932 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 1440 / / | 1016 | 0.0006331134058320474 | — | 296902 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 390 / /create | 900 | 0.0005680422428496722 | 72 | 244042 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 390 / /library | 868 | 0.0010363896985519368 | 144 | 234932 |
| [139493917703](https://github.com/faresmohamed260/renderlab/actions/jobs/139493917703) | `11b53b2a99e0efaaede6060699c53dcc13b0d408` | 390 / / | 1000 | 0.0010274332960274006 | — | 296902 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 1440 / /create | 892 | 0.0008462280189713006 | 32 | 244042 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 1440 / /library | 848 | 0.00034858669704861117 | 80 | 234932 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 1440 / / | 936 | 0.0006331134058320474 | — | 296902 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 390 / /create | 868 | 0.0005680422428496722 | 56 | 244042 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 390 / /library | 832 | 0.001997258640261381 | 120 | 234932 |
| [139494031503](https://github.com/faresmohamed260/renderlab/actions/jobs/139494031503) | `416c20115b47d10ec9e1ce23f07ec36e1839de8c` | 390 / / | 948 | 0.0010274332960274006 | — | 296902 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 1440 / /create | 952 | 0.0008462280189713006 | 48 | 244042 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 1440 / /library | 904 | 0.00034858669704861117 | 112 | 234932 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 1440 / / | 1036 | 0.0006331134058320474 | — | 296902 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 390 / /create | 912 | 0.0005680422428496722 | 80 | 244042 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 390 / /library | 872 | 0.0010363896985519368 | 184 | 234932 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 390 / / | 1028 | 0.0010274332960274006 | — | 296902 |
| [139519900824](https://github.com/faresmohamed260/renderlab/actions/jobs/139519900824) | `015ee1fb1d83822876d6af1d3c3cbefa5c4fc6df` | 1440 / /create | 940 | 0.0018036697199315201 | 48 | 244317 |
| [139519900824](https://github.com/faresmohamed260/renderlab/actions/jobs/139519900824) | `015ee1fb1d83822876d6af1d3c3cbefa5c4fc6df` | 1440 / /library | 888 | 0.00034858669704861117 | 96 | 234932 |
| [139519900824](https://github.com/faresmohamed260/renderlab/actions/jobs/139519900824) | `015ee1fb1d83822876d6af1d3c3cbefa5c4fc6df` | 390 / /create | 2656 | 0.0004146462735966144 | 64 | 244317 |
| [139519900824](https://github.com/faresmohamed260/renderlab/actions/jobs/139519900824) | `015ee1fb1d83822876d6af1d3c3cbefa5c4fc6df` | 390 / /library | 864 | 0.0010363896985519368 | 144 | 234932 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 1440 / /create | 952 | 0.0008462280189713006 | 32 | 244317 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 1440 / /library | 944 | 0.00034858669704861117 | 72 | 234932 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 1440 / / | 992 | 0.0006331134058320474 | — | 297174 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 390 / /create | 2472 | 0.0004146462735966144 | 48 | 244317 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 390 / /library | 940 | 0.001997258640261381 | 104 | 234932 |
| [139530642855](https://github.com/faresmohamed260/renderlab/actions/jobs/139530642855) | `17e52d0e3296ef2cf1b887847dba7329c325477a` | 390 / / | 992 | 0.0010274332960274006 | — | 297174 |
| [139525846025](https://github.com/faresmohamed260/renderlab/actions/jobs/139525846025) | `e106d4f4637453b7f5e365e8cde43dad3fa1d899` | 1440 / /create | 916 | 0.0008462280189713006 | 40 | 244317 |
| [139525846025](https://github.com/faresmohamed260/renderlab/actions/jobs/139525846025) | `e106d4f4637453b7f5e365e8cde43dad3fa1d899` | 1440 / /library | 884 | 0.00034858669704861117 | 96 | 234932 |
| [139525846025](https://github.com/faresmohamed260/renderlab/actions/jobs/139525846025) | `e106d4f4637453b7f5e365e8cde43dad3fa1d899` | 390 / /create | 2524 | 0.0004146462735966144 | 56 | 244317 |
| [139525846025](https://github.com/faresmohamed260/renderlab/actions/jobs/139525846025) | `e106d4f4637453b7f5e365e8cde43dad3fa1d899` | 390 / /library | 864 | 0.001997258640261381 | 120 | 234932 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 1440 / /create | 1004 | 0.0008462280189713006 | 48 | 244317 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 1440 / /library | 988 | 0.00034858669704861117 | 104 | 234932 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 1440 / / | 1080 | 0.0006331134058320474 | — | 297174 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 390 / /create | 2700 | 0.0004146462735966144 | 72 | 244317 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 390 / /library | 980 | 0.0010363896985519368 | 152 | 234932 |
| [139537476721](https://github.com/faresmohamed260/renderlab/actions/jobs/139537476721) | `646dd980465f2c89314df73bc373463409a2129a` | 390 / / | 1068 | 0.0010274332960274006 | — | 297174 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 1440 / /create | 1008 | 0.0018036697199315201 | 48 | 244317 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 1440 / /library | 996 | 0.00034858669704861117 | 104 | 234932 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 1440 / / | 1072 | 0.0006331134058320474 | — | 297174 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 390 / /create | 2700 | 0.0004146462735966144 | 64 | 244317 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 390 / /library | 968 | 0.0010363896985519368 | 144 | 234932 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 390 / / | 1068 | 0.0010274332960274006 | — | 297174 |
| [138969942803](https://github.com/faresmohamed260/renderlab/actions/jobs/138969942803) | `7806db566ae617c4ff17c7cc014d58bc4863986c` | 1440 / /create | 1772 | 0.01985757679880401 | 16 | — |
| [138969942803](https://github.com/faresmohamed260/renderlab/actions/jobs/138969942803) | `7806db566ae617c4ff17c7cc014d58bc4863986c` | 1440 / /library | 904 | 0 | 120 | — |
| [138969942803](https://github.com/faresmohamed260/renderlab/actions/jobs/138969942803) | `7806db566ae617c4ff17c7cc014d58bc4863986c` | 390 / /create | 896 | 0 | 64 | — |
| [138969942803](https://github.com/faresmohamed260/renderlab/actions/jobs/138969942803) | `7806db566ae617c4ff17c7cc014d58bc4863986c` | 390 / /library | 900 | 0 | 144 | — |
| [138982166005](https://github.com/faresmohamed260/renderlab/actions/jobs/138982166005) | `08a6e9f25ac727fbb56f075c57af796f68bd0f94` | 1440 / /create | 1740 | 0.01985757679880401 | 16 | — |
| [138982166005](https://github.com/faresmohamed260/renderlab/actions/jobs/138982166005) | `08a6e9f25ac727fbb56f075c57af796f68bd0f94` | 1440 / /library | 884 | 0 | 104 | — |
| [138982166005](https://github.com/faresmohamed260/renderlab/actions/jobs/138982166005) | `08a6e9f25ac727fbb56f075c57af796f68bd0f94` | 390 / /create | 872 | 0 | 56 | — |
| [138982166005](https://github.com/faresmohamed260/renderlab/actions/jobs/138982166005) | `08a6e9f25ac727fbb56f075c57af796f68bd0f94` | 390 / /library | 896 | 0 | 128 | — |
| [138992446225](https://github.com/faresmohamed260/renderlab/actions/jobs/138992446225) | `121d25c9bc0d8ba83a307373fb75d1e9457b8ad8` | 1440 / /create | 1776 | 0.01985757679880401 | 16 | 230035 |
| [138992446225](https://github.com/faresmohamed260/renderlab/actions/jobs/138992446225) | `121d25c9bc0d8ba83a307373fb75d1e9457b8ad8` | 1440 / /library | 900 | 0 | 120 | 225657 |
| [138992446225](https://github.com/faresmohamed260/renderlab/actions/jobs/138992446225) | `121d25c9bc0d8ba83a307373fb75d1e9457b8ad8` | 390 / /create | 912 | 0 | 72 | 230035 |
| [138992446225](https://github.com/faresmohamed260/renderlab/actions/jobs/138992446225) | `121d25c9bc0d8ba83a307373fb75d1e9457b8ad8` | 390 / /library | 920 | 0 | 168 | 225657 |
| [139010915590](https://github.com/faresmohamed260/renderlab/actions/jobs/139010915590) | `44051010328bb190b87a9c6cfa24d706ba05a2fd` | 1440 / /create | 988 | 0.11231153428819445 | 40 | 228638 |
| [139010915590](https://github.com/faresmohamed260/renderlab/actions/jobs/139010915590) | `44051010328bb190b87a9c6cfa24d706ba05a2fd` | 1440 / /library | 968 | 0 | 112 | 226298 |
| [139010915590](https://github.com/faresmohamed260/renderlab/actions/jobs/139010915590) | `44051010328bb190b87a9c6cfa24d706ba05a2fd` | 390 / /create | 1032 | 0 | 56 | 228638 |
| [139010915590](https://github.com/faresmohamed260/renderlab/actions/jobs/139010915590) | `44051010328bb190b87a9c6cfa24d706ba05a2fd` | 390 / /library | 984 | 0 | 144 | 226298 |
| [139042928861](https://github.com/faresmohamed260/renderlab/actions/jobs/139042928861) | `b01626a6335eb404959844e95c0ef1e97290992c` | 1440 / /create | 920 | 0.11231153428819445 | 32 | 230903 |
| [139042928861](https://github.com/faresmohamed260/renderlab/actions/jobs/139042928861) | `b01626a6335eb404959844e95c0ef1e97290992c` | 1440 / /library | 932 | 0 | 88 | 226361 |
| [139042928861](https://github.com/faresmohamed260/renderlab/actions/jobs/139042928861) | `b01626a6335eb404959844e95c0ef1e97290992c` | 390 / /create | 952 | 0 | 56 | 230903 |
| [139042928861](https://github.com/faresmohamed260/renderlab/actions/jobs/139042928861) | `b01626a6335eb404959844e95c0ef1e97290992c` | 390 / /library | 956 | 0 | 128 | 226361 |
| [139057305701](https://github.com/faresmohamed260/renderlab/actions/jobs/139057305701) | `da4d3a58d0ad6f4a8947b2078d97378534713e32` | 1440 / /create | 920 | 0.11231153428819445 | 32 | 230924 |
| [139057305701](https://github.com/faresmohamed260/renderlab/actions/jobs/139057305701) | `da4d3a58d0ad6f4a8947b2078d97378534713e32` | 1440 / /library | 940 | 0 | 88 | 226423 |
| [139057305701](https://github.com/faresmohamed260/renderlab/actions/jobs/139057305701) | `da4d3a58d0ad6f4a8947b2078d97378534713e32` | 390 / /create | 960 | 0 | 48 | 230924 |
| [139057305701](https://github.com/faresmohamed260/renderlab/actions/jobs/139057305701) | `da4d3a58d0ad6f4a8947b2078d97378534713e32` | 390 / /library | 948 | 0 | 120 | 226423 |
| [139356694155](https://github.com/faresmohamed260/renderlab/actions/jobs/139356694155) | `65bd5ecf547605ed78bcdc46df651768fe570f6c` | 1440 / /create | 1036 | 0.11244625955798826 | 32 | 232850 |
| [139356694155](https://github.com/faresmohamed260/renderlab/actions/jobs/139356694155) | `65bd5ecf547605ed78bcdc46df651768fe570f6c` | 1440 / /library | 1052 | 0.00034858669704861117 | 80 | 232277 |
| [139356694155](https://github.com/faresmohamed260/renderlab/actions/jobs/139356694155) | `65bd5ecf547605ed78bcdc46df651768fe570f6c` | 390 / /create | 1036 | 0.0006794188124237251 | 56 | 232850 |
| [139356694155](https://github.com/faresmohamed260/renderlab/actions/jobs/139356694155) | `65bd5ecf547605ed78bcdc46df651768fe570f6c` | 390 / /library | 1084 | 0.0005909839832139139 | 120 | 232277 |
| [139357819232](https://github.com/faresmohamed260/renderlab/actions/jobs/139357819232) | `efa0014afba41548f6f51b70d71c72a3abf3c644` | 1440 / /create | 1080 | 0.11244625955798826 | 48 | 232702 |
| [139357819232](https://github.com/faresmohamed260/renderlab/actions/jobs/139357819232) | `efa0014afba41548f6f51b70d71c72a3abf3c644` | 1440 / /library | 1104 | 0.00034858669704861117 | 120 | 232129 |
| [139357819232](https://github.com/faresmohamed260/renderlab/actions/jobs/139357819232) | `efa0014afba41548f6f51b70d71c72a3abf3c644` | 390 / /create | 1060 | 0.0006794188124237251 | 80 | 232702 |
| [139357819232](https://github.com/faresmohamed260/renderlab/actions/jobs/139357819232) | `efa0014afba41548f6f51b70d71c72a3abf3c644` | 390 / /library | 1148 | 0.0005909839832139139 | 200 | 232129 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 1440 / /create | 896 | 0.11244625955798826 | 40 | 237169 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 1440 / /library | 876 | 0.00034858669704861117 | 96 | 234010 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 1440 / / | 972 | 0.0006331134058320474 | — | 290029 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 390 / /create | 884 | 0.0005680422428496722 | 56 | 237169 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 390 / /library | 896 | 0.00045255355942658005 | 136 | 234010 |
| [139379721047](https://github.com/faresmohamed260/renderlab/actions/jobs/139379721047) | `bcc3ae88798505fb27bf1630f602360d55bacadf` | 390 / / | 968 | 0.0010274332960274006 | — | 290029 |
| [139389119435](https://github.com/faresmohamed260/renderlab/actions/jobs/139389119435) | `bb508b0f6a24f26420be0ef299a3302555b0d137` | 1440 / /create | 916 | 0.11244625955798826 | 48 | 237169 |
| [139389119435](https://github.com/faresmohamed260/renderlab/actions/jobs/139389119435) | `bb508b0f6a24f26420be0ef299a3302555b0d137` | 1440 / /library | 892 | 0.00034858669704861117 | 104 | 234010 |
| [139389119435](https://github.com/faresmohamed260/renderlab/actions/jobs/139389119435) | `bb508b0f6a24f26420be0ef299a3302555b0d137` | 390 / /create | 892 | 0.0005680422428496722 | 72 | 237169 |
| [139389119435](https://github.com/faresmohamed260/renderlab/actions/jobs/139389119435) | `bb508b0f6a24f26420be0ef299a3302555b0d137` | 390 / /library | 904 | 0.00045255355942658005 | 160 | 234010 |
| [139389168277](https://github.com/faresmohamed260/renderlab/actions/jobs/139389168277) | `0aeaf4c02558ceb52446bcf7349dc7a6bcc639bb` | 1440 / /create | 880 | 0.11244625955798826 | 48 | 236965 |
| [139389168277](https://github.com/faresmohamed260/renderlab/actions/jobs/139389168277) | `0aeaf4c02558ceb52446bcf7349dc7a6bcc639bb` | 1440 / /library | 880 | 0.00034858669704861117 | 96 | 233806 |
| [139389168277](https://github.com/faresmohamed260/renderlab/actions/jobs/139389168277) | `0aeaf4c02558ceb52446bcf7349dc7a6bcc639bb` | 390 / /create | 848 | 0.0005680422428496722 | 64 | 236965 |
| [139389168277](https://github.com/faresmohamed260/renderlab/actions/jobs/139389168277) | `0aeaf4c02558ceb52446bcf7349dc7a6bcc639bb` | 390 / /library | 892 | 0.00045255355942658005 | 152 | 233806 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 1440 / /create | 876 | 0.11244625955798826 | 32 | 237169 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 1440 / /library | 864 | 0.00034858669704861117 | 80 | 234010 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 1440 / / | 940 | 0.0006331134058320474 | — | 290029 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 390 / /create | 876 | 0.0005680422428496722 | 56 | 237169 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 390 / /library | 868 | 0.00045255355942658005 | 128 | 234010 |
| [139422029298](https://github.com/faresmohamed260/renderlab/actions/jobs/139422029298) | `54dd71f03d83bb1968456a9323df56490c951e98` | 390 / / | 948 | 0.0010274332960274006 | — | 290029 |
| [139437780589](https://github.com/faresmohamed260/renderlab/actions/jobs/139437780589) | `90e6051752fb77b87aacf734af8c3726e2fed277` | 1440 / /create | 880 | 0.11244625955798826 | 32 | 237169 |
| [139437780589](https://github.com/faresmohamed260/renderlab/actions/jobs/139437780589) | `90e6051752fb77b87aacf734af8c3726e2fed277` | 1440 / /library | 852 | 0.00034858669704861117 | 72 | 234010 |
| [139437780589](https://github.com/faresmohamed260/renderlab/actions/jobs/139437780589) | `90e6051752fb77b87aacf734af8c3726e2fed277` | 390 / /create | 864 | 0.0005680422428496722 | 48 | 237169 |
| [139437780589](https://github.com/faresmohamed260/renderlab/actions/jobs/139437780589) | `90e6051752fb77b87aacf734af8c3726e2fed277` | 390 / /library | 848 | 0.00045255355942658005 | 96 | 234010 |
| [139440931743](https://github.com/faresmohamed260/renderlab/actions/jobs/139440931743) | `f4e83dd84bb23cd212de4b6a7268af7afe7b6cc8` | 1440 / /create | 880 | 0.11244625955798826 | 32 | 237169 |
| [139440931743](https://github.com/faresmohamed260/renderlab/actions/jobs/139440931743) | `f4e83dd84bb23cd212de4b6a7268af7afe7b6cc8` | 1440 / /library | 852 | 0.00034858669704861117 | 72 | 234010 |
| [139440931743](https://github.com/faresmohamed260/renderlab/actions/jobs/139440931743) | `f4e83dd84bb23cd212de4b6a7268af7afe7b6cc8` | 390 / /create | 872 | 0.0005680422428496722 | 56 | 237169 |
| [139440931743](https://github.com/faresmohamed260/renderlab/actions/jobs/139440931743) | `f4e83dd84bb23cd212de4b6a7268af7afe7b6cc8` | 390 / /library | 876 | 0.00045255355942658005 | 128 | 234010 |
| [139442736412](https://github.com/faresmohamed260/renderlab/actions/jobs/139442736412) | `9d7f17b5fae0072c0a0edca3e486720a969d5fb5` | 1440 / /create | 876 | 0.11244625955798826 | 32 | 237169 |
| [139442736412](https://github.com/faresmohamed260/renderlab/actions/jobs/139442736412) | `9d7f17b5fae0072c0a0edca3e486720a969d5fb5` | 1440 / /library | 864 | 0.00034858669704861117 | 72 | 234010 |
| [139442736412](https://github.com/faresmohamed260/renderlab/actions/jobs/139442736412) | `9d7f17b5fae0072c0a0edca3e486720a969d5fb5` | 390 / /create | 868 | 0.0005680422428496722 | 48 | 237169 |
| [139442736412](https://github.com/faresmohamed260/renderlab/actions/jobs/139442736412) | `9d7f17b5fae0072c0a0edca3e486720a969d5fb5` | 390 / /library | 856 | 0.00045255355942658005 | 112 | 234010 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 1440 / /create | 932 | 0.0018036697199315201 | 48 | 237689 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 1440 / /library | 892 | 0.00034858669704861117 | 112 | 234317 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 1440 / / | 1020 | 0.0006331134058320474 | — | 290549 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 390 / /create | 904 | 0.0005680422428496722 | 72 | 237689 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 390 / /library | 908 | 0.00045255355942658005 | 168 | 234317 |
| [139464472898](https://github.com/faresmohamed260/renderlab/actions/jobs/139464472898) | `48b4892d77a24ee5f30d3a5eb0ccddd7b2798df6` | 390 / / | 1004 | 0.0010274332960274006 | — | 290549 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 1440 / /create | 896 | 0.0008462280189713006 | 32 | 237689 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 1440 / /library | 848 | 0.00034858669704861117 | 72 | 234317 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 1440 / / | 936 | 0.0006331134058320474 | — | 290549 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 390 / /create | 880 | 0.0005680422428496722 | 56 | 237689 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 390 / /library | 860 | 0.00045255355942658005 | 112 | 234317 |
| [139465960544](https://github.com/faresmohamed260/renderlab/actions/jobs/139465960544) | `6e3568ec66073e0c73f579fa76e53770ff7524a9` | 390 / / | 936 | 0.0010274332960274006 | — | 290549 |
| [139487915904](https://github.com/faresmohamed260/renderlab/actions/jobs/139487915904) | `bfc212ddfb29b4b84ec7bb3680aafad7779ea8de` | 1440 / /create | 892 | 0.0008462280189713006 | 32 | 244042 |
| [139487915904](https://github.com/faresmohamed260/renderlab/actions/jobs/139487915904) | `bfc212ddfb29b4b84ec7bb3680aafad7779ea8de` | 1440 / /library | 852 | 0.00034858669704861117 | 80 | 234932 |
| [139487915904](https://github.com/faresmohamed260/renderlab/actions/jobs/139487915904) | `bfc212ddfb29b4b84ec7bb3680aafad7779ea8de` | 390 / /create | 876 | 0.0005680422428496722 | 56 | 244042 |
| [139487915904](https://github.com/faresmohamed260/renderlab/actions/jobs/139487915904) | `bfc212ddfb29b4b84ec7bb3680aafad7779ea8de` | 390 / /library | 840 | 0.001997258640261381 | 112 | 234932 |
| [139494481263](https://github.com/faresmohamed260/renderlab/actions/jobs/139494481263) | `0599712bfa4019a7dee742eb944c83d8744c0a6c` | 1440 / /create | 904 | 0.0008462280189713006 | 32 | 244042 |
| [139494481263](https://github.com/faresmohamed260/renderlab/actions/jobs/139494481263) | `0599712bfa4019a7dee742eb944c83d8744c0a6c` | 1440 / /library | 868 | 0.00034858669704861117 | 80 | 234932 |
| [139494481263](https://github.com/faresmohamed260/renderlab/actions/jobs/139494481263) | `0599712bfa4019a7dee742eb944c83d8744c0a6c` | 390 / /create | 876 | 0.0005680422428496722 | 56 | 244042 |
| [139494481263](https://github.com/faresmohamed260/renderlab/actions/jobs/139494481263) | `0599712bfa4019a7dee742eb944c83d8744c0a6c` | 390 / /library | 840 | 0.0010363896985519368 | 120 | 234932 |
| [139503240338](https://github.com/faresmohamed260/renderlab/actions/jobs/139503240338) | `bb3c4024e23d4073f5ebfd910618f65c9ea43d68` | 1440 / /create | 920 | 0.0008462280189713006 | 40 | 244058 |
| [139503240338](https://github.com/faresmohamed260/renderlab/actions/jobs/139503240338) | `bb3c4024e23d4073f5ebfd910618f65c9ea43d68` | 1440 / /library | 872 | 0.00034858669704861117 | 96 | 234932 |
| [139503240338](https://github.com/faresmohamed260/renderlab/actions/jobs/139503240338) | `bb3c4024e23d4073f5ebfd910618f65c9ea43d68` | 390 / /create | 2544 | 0.0004146462735966144 | 56 | 244058 |
| [139503240338](https://github.com/faresmohamed260/renderlab/actions/jobs/139503240338) | `bb3c4024e23d4073f5ebfd910618f65c9ea43d68` | 390 / /library | 856 | 0.0010363896985519368 | 128 | 234932 |
| [139510117903](https://github.com/faresmohamed260/renderlab/actions/jobs/139510117903) | `c4211b2e974efeefc475df38d988294f47a02ae2` | 1440 / /create | 932 | 0.0018036697199315201 | 40 | 244058 |
| [139510117903](https://github.com/faresmohamed260/renderlab/actions/jobs/139510117903) | `c4211b2e974efeefc475df38d988294f47a02ae2` | 1440 / /library | 908 | 0.00034858669704861117 | 96 | 234932 |
| [139510117903](https://github.com/faresmohamed260/renderlab/actions/jobs/139510117903) | `c4211b2e974efeefc475df38d988294f47a02ae2` | 390 / /create | 2628 | 0.0004146462735966144 | 64 | 244058 |
| [139510117903](https://github.com/faresmohamed260/renderlab/actions/jobs/139510117903) | `c4211b2e974efeefc475df38d988294f47a02ae2` | 390 / /library | 860 | 0.0010363896985519368 | 144 | 234932 |
| [139379244679](https://github.com/faresmohamed260/renderlab/actions/jobs/139379244679) | `42a785cae065cc6b2eb4161792bc4256d9b4adf0` | 1440 / /create | 872 | 0.11244625955798826 | 32 | 237169 |
| [139379244679](https://github.com/faresmohamed260/renderlab/actions/jobs/139379244679) | `42a785cae065cc6b2eb4161792bc4256d9b4adf0` | 1440 / /library | 852 | 0.00034858669704861117 | 72 | 234010 |
| [139379244679](https://github.com/faresmohamed260/renderlab/actions/jobs/139379244679) | `42a785cae065cc6b2eb4161792bc4256d9b4adf0` | 390 / /create | 864 | 0.0005680422428496722 | 48 | 237169 |
| [139379244679](https://github.com/faresmohamed260/renderlab/actions/jobs/139379244679) | `42a785cae065cc6b2eb4161792bc4256d9b4adf0` | 390 / /library | 864 | 0.00045255355942658005 | 120 | 234010 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 1440 / /create | 1004 | 0.0017387319556970166 | 48 | 244317 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 1440 / /library | 1000 | 0.00034858669704861117 | 112 | 234932 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 1440 / / | 1084 | 0.0006331134058320474 | — | 297174 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 390 / /create | 2724 | 0.0004146462735966144 | 72 | 244317 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 390 / /library | 980 | 0.0010363896985519368 | 176 | 234932 |
| [139541076740](https://github.com/faresmohamed260/renderlab/actions/jobs/139541076740) | `77d409677e50d590cb927f357d9dd01628cc67c3` | 390 / / | 1068 | 0.0010274332960274006 | — | 297174 |

Independent Landing selected-interaction scenarios (#817): trusted Tab from first to second collage button, selection and focus verified; intentionally separate from LCP finalization.

| Job | Source SHA | Width | Median ms | Samples ms |
| --- | --- | ---: | ---: | --- |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 1440 | 72 | 72, 72, 80, 80, 72 |
| [139486360592](https://github.com/faresmohamed260/renderlab/actions/jobs/139486360592) | `9ad568c7eb76b9783c03880e8600b954b6841142` | 390 | 56 | 56, 48, 56, 56, 56 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 1440 | 80 | 80, 72, 72, 80, 80 |
| [139494156163](https://github.com/faresmohamed260/renderlab/actions/jobs/139494156163) | `9e61278f69b8269c9b02e55c6f7aa21d5c15508b` | 390 | 64 | 64, 64, 64, 56, 56 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 1440 | 72 | 72, 64, 72, 72, 72 |
| [139541322995](https://github.com/faresmohamed260/renderlab/actions/jobs/139541322995) | `33fb9d96d64709b3a9793ae79b16a702ba41c855` | 390 | 56 | 56, 56, 56, 48, 64 |

Evidence boundary: branch-filtered Actions listings for the Worker 4 pilot, JS transfer metric, Landing hero, Admin Observe, Landing scenarios, bundle attribution, selected interaction, expanded axe, Landing accessibility, and rejected deferral experiments were used to recover historical measurements in addition to the identified integrated and comparison jobs. This is a ledger of retrieved structured medians, not an exhaustive inventory of every unrelated PR build in the repository. Earlier pilot jobs without JS collection show unavailable (—), not zero. Failed jobs 138969300263, 138969513448, 139355525531 emitted no structured medians; cancelled runs are not counted as qualified measurements. Earlier fixture revisions and old geometry failures are retained, not used as present-state budget evidence.

## Production-build signed-out HTTP evidence

Matched historical baseline #801, exact `04cdad4ad0393c5ca337359343dafd26472e6962`, [HTTP job 139473863867](https://github.com/faresmohamed260/renderlab/actions/jobs/139473863867): Create **339,915 B**, Library **315,738 B**, Landing **284,859 B** compressed JS entity bytes (gzip/identity). These are emitted production-build HTTP payloads, not a live production deployment measurement. Earlier graph baseline `6e3568ec66073e0c73f579fa76e53770ff7524a9` job 139465953026: Create 339,894, Library 315,125, Landing 284,838 B. Do not substitute later heads for a matched baseline. Later qualified #801 HTTP job 139537477277 records two production route-graph sets (Create 345665/345932 B, Library 315738/315738 B, Landing 284859/284856 B). These are later-build results, not the historical matched baseline. Latest #801 and #817 phone Create lab LCP is 2700 ms on both heads; this exceeds the 2500 ms target even though the hard 4000 ms assertion passes. Do not label this as a regression from a matched product experiment or ratchet it downward without diagnosis.

| Candidate | Create B | Library B | Landing B | Disposition |
| --- | ---: | ---: | ---: | --- |
| #810 legacy AppShell (HTTP 139480736351) | 339915 (0) | 315738 (0) | 284859 (0) | Rejected: no byte saving |
| #812 legacy CreateWorkspace (HTTP 139487865505) | 341339 (+1424) | 316472 (+734) | 285018 (+159) | Rejected: increases on all routes |
| #816 signed-out Landing shell (HTTP 139493282407) | 346007 (+6092) | 323637 (+7899) | 245162 (-39697) | Rejected: cross-route and LCP regressions |

## Rejected candidates and geometry

- [#804](https://github.com/faresmohamed260/renderlab/pull/804): matched fixture Library 234010 → 233427 B at both widths (-583); desktop LCP 868→904 ms, interaction 96→112 ms, CLS .000348587 unchanged; phone LCP 888→908 ms, interaction 144→160 ms, CLS .000452554 unchanged. Candidate job 139442219306, baseline 139437291311. Savings not sufficient to justify regression; closed without merge.
- [#810](https://github.com/faresmohamed260/renderlab/pull/810): exact `4ea8873d5438e01e15e68ad8621a8ce867847bb7`, 11/11 green; no HTTP savings. Phone Library CLS .001036390→.001997259 on the historical matched comparison. Closed; mounted job 139480874574 (161 passed, 6 existing skips).
- [#812](https://github.com/faresmohamed260/renderlab/pull/812): exact `0f4a4be3ff647cd8ea5e944a5b826fffead84a3e`, HTTP increases on every route; phone Library CLS .001036390→.001997259. Closed.
- [#816](https://github.com/faresmohamed260/renderlab/pull/816): exact `c822591cbdeea68378ba44df5f1070f11bb3b1dc`. Desktop Create/Library/Landing LCP 944/888/1008→1120/1060/1200 ms; phone 896/872/996→1092/1044/1208 ms. Every increase exceeded the historical baseline sample range. Cold JS Create 237689→246060, Library 234932→244518, Landing 290549→280580 B at both widths. Mounted job 139493284065: 163 passed, 6 existing skips, 2 signed-in legacy account-header assertions failed at 1440 and 390. Closed.
- [#733](https://github.com/faresmohamed260/renderlab/pull/733): merged geometry fix; exact `ffa8fd26d59eeb3b279eec410692e9f775025be8`, job 139421627602: all five desktop Create CLS samples .0008462280189713006. Not a field metric; final integrated measurement pending.

Additional Phase 6 image-delivery experiment, for completeness: #723 q75 WebP failed the unchanged 38 dB floor at hero1200 (37.06 dB) and resolve1920/3840 (37.11 dB). The separately qualified q90 candidate was integrated via #763: job 139052802051 records hero1200 80,820 B / 39.71 dB, hero1920/3840 121,908 B / 42.46 dB, resolve1920/3840 121,362 B / 40.04 dB, with geometry assertions passed. #761 image decode/priority hints were also integrated via #763; job 139042928861 is a synthetic fixture measurement, not an isolated causal LCP improvement claim.

## Shared chunk conclusion (closed)

Two common initial production JS chunks: `3jn_x8ihwq16e.js` 71,681 compressed / 229,052 raw B; `34dnacv0-3khd.js` 44,294 compressed / 160,168 raw B; total 115,975 compressed B. Most plausibly React/Next client runtime baseline, but module ownership is **not established**. Manifest references and marker strings are not byte-level attribution. [#820](https://github.com/faresmohamed260/renderlab/pull/820) failed identity joins in standalone analyzer job 139496755355, build-integrated analyzer job 139505826289, and executable-code alias job 139510715608; last exact head `1a32dc17a43fefd7cad82d5f537cfc8b443af2d5`. Head engineer decision: stop; compiler asset mapping or production source maps would require a separate authorization. No speculative deferrals, no retries, no production instrumentation.

## Proposed budget ratchets

**Proposal for owner decision, not applied.** Candidate ceilings for an unchanged fixture after integrated repeatability, not a revision of any assertion or baseline. Existing LCP hard 4000 ms / target 2500 ms, CLS 0.1, selected-interaction 200 ms remain as-is. Historical geometry failure and deliberately rejected candidates are excluded from suggested healthy-state limits.

| Lane | Candidate ceiling | Basis / caveat |
| --- | --- | --- |
| Slow-4G lab cold LCP | 1500 ms per route/device median except phone Create; retain current 4000 ms hard ceiling and 2500 ms target for phone Create | Latest #801 and #817 each measured phone Create median 2700 ms, #760 measured 2724 ms, and #759 measured 2524 ms; do not propose a tighter phone Create ceiling without repeatability and diagnosis. |
| Slow-4G CLS | 0.01 per sample | After integrated geometry verification; preserve every current per-sample assertion |
| Slow-4G selected interaction | retain 200 ms initially | Library phone variation and independent Landing interaction need repeatability |
| Slow-4G pre-input fixture JS | Create 260000 B; Library 250000 B; Landing 320000 B | Fixture-only transfer budgets, reevaluate against exact integrated head |
| Signed-out production HTTP JS | Create 365000 B; Library 325000 B; Landing 300000 B | Compressed entity bytes, not fixture transfer; latest qualified #801 comparison includes Create 345665/345932 B. Confirm integrated main first. |

## Accessibility evidence boundary

Expanded #803 job 139519900817: 27 real states, zero Landing violations, zero target-size violations, 17 remaining violating node occurrences (11 shell, 2 Settings avatar, 2 MFA link, 2 Library). 811 incomplete nodes: 784 contrast, 17 hidden-focus, 10 prohibited-ARIA review checks. These are not passes and must not be suppressed. Component review job 139519899966 retains four `Arbitrary future artwork` MANUAL rows (desktop and phone, both motion modes), unbounded artwork has no universal pixel ratio; representative fallback/gradient headings measured separately. Do not equate these four review rows with all axe incomplete nodes. No false-positive classification without rendered evidence.

Integrated-main ledger, exact selector read-back and per-node manual assessment remain pending #760 and #817 integration. No production release, migration, infrastructure or Admin control authorization.
