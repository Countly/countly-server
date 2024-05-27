/* global countlyQueryBuilder, jQuery, _ */

(function() {
    jQuery(function() {
        if (window.countlyQueryBuilder) {
            var indexedProps = [
                "app_version",
                "background",
                "cpu",
                "device",
                "muted",
                "online",
                "opengl",
                "orientation",
                "os_version",
                "resolution",
                "root",
                "signal",
            ];

            var exportOrGroup = function(rows) {
                return (rows || []).reduce(function(query, row) {
                    var negateValue = row.operator.id === "cly.!=";
                    var subquery = {};

                    if (indexedProps.includes(row.property.id)) {
                        (Array.isArray(row.value.data)
                            ? row.value.data
                            : [row.value.data]
                        ).forEach(function(v) {
                            if (row.property.id === "app_version") {
                                v = (v + "").replace(/\./g, ":");
                            }
                            subquery[row.property.id + "." + v] = {
                                $exists: !negateValue,
                            };
                        });
                    }
                    else {
                        var op = {
                            "cly.>": "$gt",
                            "cly.>=": "$gte",
                            "cly.<": "$lt",
                            "cly.<=": "$lte",
                            "cly.=": "$in",
                            "cly.!=": "$nin",
                            "cly.contains": "$regex",
                            "cly.beginswith": "$regex",
                            "cly.between": function(r) {
                                return {
                                    $gte: r.value.data[0],
                                    $lte: r.value.data[1],
                                };
                            },
                        }[row.operator.id];

                        if (typeof op === "string") {
                            subquery[row.property.id] = {};

                            if (
                                ["$in", "$nin"].includes(op) &&
                                !Array.isArray(row.value.data)
                            ) {
                                subquery[row.property.id][op] = [
                                    row.value.data,
                                ];
                            }
                            else {
                                subquery[row.property.id][op] = row.value.data;
                            }
                        }
                        else if (typeof op === "function") {
                            subquery[row.property.id] = op(row);
                        }
                    }

                    Object.keys(subquery).forEach(function(propId) {
                        if (!(propId in query)) {
                            query[propId] = {};
                        }

                        Object.keys(subquery[propId]).forEach(function(opId) {
                            if (["$in", "$nin"].includes(opId)) {
                                if (!(opId in query[propId])) {
                                    query[propId][opId] = [];
                                }

                                query[propId][opId] = query[propId][
                                    opId
                                ].concat(subquery[propId][opId]);
                            }
                            else {
                                query[propId][opId] = subquery[propId][opId];
                            }
                        });
                    });

                    return query;
                }, {});
            };

            var importSubquery = function(query, conjunction) {
                var rawRows = [];
                conjunction = conjunction || countlyQueryBuilder.RowConj.AND;

                Object.keys(query).forEach(function(key) {
                    if (key === "$and") {
                        rawRows = rawRows.concat(
                            _.flatten(
                                query[key].map(function(andBranch) {
                                    return importSubquery(
                                        andBranch,
                                        countlyQueryBuilder.RowConj.AND
                                    );
                                })
                            )
                        );
                        return;
                    }
                    if (key === "$or") {
                        rawRows = rawRows.concat(
                            _.flatten(
                                query[key].map(function(orBranch, idx) {
                                    if (idx === 0) {
                                        return importSubquery(
                                            orBranch,
                                            countlyQueryBuilder.RowConj.AND
                                        );
                                    }
                                    return importSubquery(
                                        orBranch,
                                        countlyQueryBuilder.RowConj.OR
                                    );
                                })
                            )
                        );
                        return;
                    }
                    var field = query[key];
                    if (
                        Object.prototype.hasOwnProperty.call(field, "$gte") &&
                        Object.prototype.hasOwnProperty.call(field, "$lte")
                    ) {
                        rawRows.push({
                            propertyId: key,
                            operatorId: "cly.between",
                            valueData: [field.$gte, field.$lte],
                            conjunction: conjunction,
                        });
                        delete field.$gte;
                        delete field.$lte;
                    }
                    Object.keys(field).forEach(function(mongoOp) {
                        var op = {
                            $gt: "cly.>",
                            $gte: "cly.>=",
                            $lt: "cly.<",
                            $lte: "cly.<=",
                            $in: "cly.=",
                            $nin: "cly.!=",
                            $exists: function(data) {
                                var dotIndex = key.indexOf(".");
                                var propertyId = key.slice(0, dotIndex);
                                var value = key.slice(dotIndex + 1, key.length);
                                if (propertyId === "app_version") {
                                    value = (value + "").replace(/:/g, ".");
                                }
                                return {
                                    propertyId: propertyId,
                                    operatorId: data ? "cly.=" : "cly.!=",
                                    valueData: [
                                        value,
                                    ],
                                };
                            },
                            $regex: function(data) {
                                return {
                                    operatorId: "cly.contains",
                                    valueData: data,
                                };
                            },
                        }[mongoOp];

                        if (op) {
                            var baseObj = {
                                propertyId: key,
                                conjunction: conjunction,
                            };

                            if (mongoOp === "$exists") {
                                var rowToPush = _.extend(
                                    baseObj,
                                    op(field[mongoOp])
                                );
                                var rowIndex = rawRows.findIndex(function(
                                    row
                                ) {
                                    return (
                                        row.propertyId === rowToPush.propertyId
                                    );
                                });

                                if (rowIndex === -1) {
                                    rawRows.push(rowToPush);
                                }
                                else {
                                    rawRows[rowIndex].valueData.push(
                                        rowToPush.valueData[0]
                                    );
                                }
                            }
                            else if (typeof op === "function") {
                                rawRows.push(
                                    _.extend(baseObj, op(field[mongoOp]))
                                );
                            }
                            else {
                                rawRows.push(
                                    _.extend(baseObj, {
                                        operatorId: op,
                                        valueData: field[mongoOp],
                                    })
                                );
                            }
                        }
                    });
                });

                return rawRows;
            };

            countlyQueryBuilder.registerQueryFormat("crashgroups", {
                import: function(value) {
                    if (!value.query && !value.byVal) {
                        return new countlyQueryBuilder.FrozenQuery({});
                    }

                    return new countlyQueryBuilder.FrozenQuery({
                        rows: importSubquery(value.query).map(function(
                            row,
                            idx
                        ) {
                            row.id = idx;
                            return new countlyQueryBuilder.FrozenRow(row);
                        }),
                        groupByProps: value.byVal,
                    });
                },
                export: function(currentQuery) {
                    var rows = currentQuery.rows,
                        grouped = _.groupBy(rows, "orGroup"),
                        exportedOrGroups = [],
                        mainObject = null;

                    Object.keys(grouped).forEach(function(key) {
                        if (key === countlyQueryBuilder.NO_GROUP) {
                            mainObject = exportOrGroup(
                                grouped[countlyQueryBuilder.NO_GROUP]
                            );
                        }
                        else {
                            exportedOrGroups.push({
                                $or: grouped[key].map(function(row) {
                                    return exportOrGroup([row]);
                                }),
                            });
                        }
                    });

                    if (exportedOrGroups.length === 0) {
                        return {
                            query: mainObject || {},
                            byVal: currentQuery.groupByProps,
                        };
                    }
                    else if (exportedOrGroups.length === 1) {
                        return {
                            query: _.extend(
                                mainObject || {},
                                exportedOrGroups[0]
                            ),
                            byVal: currentQuery.groupByProps,
                        };
                    }
                    else {
                        if (mainObject) {
                            exportedOrGroups.unshift(mainObject);
                        }
                        return {
                            query: {
                                $and: exportedOrGroups,
                            },
                            byVal: currentQuery.groupByProps,
                        };
                    }
                },
            });
        }
    });
})();
