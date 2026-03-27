'use strict';

const MongoClient = require('./lib/client');
const { Db, Admin } = require('./lib/db');
const { Collection } = require('./lib/collection');
const { Cursor } = require('./lib/cursor');
const { AggregationCursor } = require('./lib/aggregationCursor');
const { ObjectId } = require('./lib/objectId');
const { Long, Decimal128, Binary, Timestamp, MinKey, MaxKey, Code, BSONRegExp, Double, Int32, UUID, DBRef } = require('./lib/bson');
const { ReadPreference } = require('./lib/readPreference');
const { WriteConcern } = require('./lib/writeConcern');
const { ReadConcern } = require('./lib/readConcern');
const { ClientSession } = require('./lib/session');
const { ChangeStream } = require('./lib/changeStream');
const { GridFSBucket } = require('./lib/gridfs');
const {
  MongoError, MongoDriverError, MongoAPIError, MongoRuntimeError,
  MongoNetworkError, MongoNetworkTimeoutError,
  MongoServerError, MongoServerSelectionError,
  MongoParseError, MongoInvalidArgumentError, MongoCompatibilityError,
  MongoWriteConcernError, MongoBulkWriteError,
  MongoTransactionError, MongoExpiredSessionError,
  MongoNotConnectedError, MongoTopologyClosedError,
  MongoCursorExhaustedError, MongoCursorInUseError,
  MongoGridFSStreamError, MongoGridFSChunkError,
  MongoChangeStreamError, MongoSystemError,
  MongoMissingCredentialsError, MongoMissingDependencyError,
  MongoTailableCursorError, MongoBatchReExecutionError,
  MongoUnexpectedServerResponseError,
  MongoDecompressionError, MongoStalePrimaryError
} = require('./lib/errors');
const { BulkWriteResult, OrderedBulkOperation, UnorderedBulkOperation } = require('./lib/bulkWrite');

// ReturnDocument enum for findOneAndUpdate/Replace
const ReturnDocument = Object.freeze({
  BEFORE: 'before',
  AFTER: 'after'
});

module.exports = {
  MongoClient,
  Db,
  Admin,
  Collection,
  Cursor,
  AggregationCursor,
  ObjectId,
  Long,
  Decimal128,
  Binary,
  Timestamp,
  MinKey,
  MaxKey,
  Code,
  BSONRegExp,
  Double,
  Int32,
  UUID,
  DBRef,
  ReadPreference,
  WriteConcern,
  ReadConcern,
  ReturnDocument,
  ClientSession,
  ChangeStream,
  GridFSBucket,
  MongoError,
  MongoDriverError,
  MongoAPIError,
  MongoRuntimeError,
  MongoNetworkError,
  MongoNetworkTimeoutError,
  MongoServerError,
  MongoServerSelectionError,
  MongoParseError,
  MongoInvalidArgumentError,
  MongoCompatibilityError,
  MongoWriteConcernError,
  MongoBulkWriteError,
  MongoTransactionError,
  MongoExpiredSessionError,
  MongoNotConnectedError,
  MongoTopologyClosedError,
  MongoCursorExhaustedError,
  MongoCursorInUseError,
  MongoGridFSStreamError,
  MongoGridFSChunkError,
  MongoChangeStreamError,
  MongoSystemError,
  MongoMissingCredentialsError,
  MongoMissingDependencyError,
  MongoTailableCursorError,
  MongoBatchReExecutionError,
  MongoUnexpectedServerResponseError,
  MongoDecompressionError,
  MongoStalePrimaryError,
  BulkWriteResult,
  OrderedBulkOperation,
  UnorderedBulkOperation
};
