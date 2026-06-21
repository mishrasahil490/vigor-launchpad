const express = require("express");
const crudRouter = require("./crudFactory");

const router = express.Router();

router.use(
  "/",
  crudRouter("vendors", {
    ownerField: "addedById",
    writeRoles: ["Super Admin", "Manager", "Finance"],
    searchFields: ["vendorName", "serviceType", "contactPerson", "email"],
  })
);

module.exports = router;
