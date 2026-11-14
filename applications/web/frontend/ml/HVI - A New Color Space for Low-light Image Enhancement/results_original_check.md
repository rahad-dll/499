# Paper on its own data: ours vs. the paper

| Metric | Paper (page) | lolv1 | lolv2_real |
|---|---|---|---|
| LOLv1, GT mean: PSNR (dB), wo-perc weights | 28.201 (README: 28.1405) (p.6, Table 1) | 28.23 |  |
| LOLv1, GT mean: SSIM | 0.889 (README: 0.8887) (p.6, Table 1) | 0.89 |  |
| LOLv1, GT mean: LPIPS | 0.079 (README: 0.0988; w-perc 0.0791) (p.6, Table 1) | 0.0988 |  |
| LOLv1, no GT mean: PSNR (dB), wo-perc weights | README: 23.5000 (the paper gives none) | 23.61 |  |
| LOLv1, w-perc weights, GT mean: PSNR (dB) | README: 27.7146 | 27.73 |  |
| LOLv2-Real: PSNR (dB), best-PSNR weights, no GT mean | 24.111 (README: lost weights; public 23.9040) (p.6, Table 1) |  | 23.89 |
| LOLv2-Real: SSIM, best-PSNR weights | 0.871 (README: 0.8656) (p.6, Table 1) |  | 0.87 |
| LOLv2-Real: LPIPS, best-PSNR weights | 0.108 (README: 0.1219) (p.6, Table 1) |  | 0.12 |
| LOLv2-Real: SSIM, best-SSIM weights | README: 0.8705 |  | 0.87 |
| LOLv2-Real: PSNR, generalization weights (used in the main kit) | - |  | 21.30 |
| Params (M) | 1.88 (p.6, Table 1) | 1.98 |  |
| GPU ms per LOLv2 image (600 x 400) | 53 (GPU not named) (p.7, Table 3) |  | 83.24 |

Same data and split as the paper (its own published data / weights), so this IS a direct check of
the paper's numbers. Remaining differences come from software versions, hardware and randomness.

'GT mean' uses the ground truth at test time (brightness taken from the target image), so it is not something a real system can do; the plain rows are the honest numbers.
