// You'll need an authMiddleware to protect these routes
router.get("/workspace", authMiddleware, getWorkspace);
router.put("/workspace/save", authMiddleware, saveWorkspace);
