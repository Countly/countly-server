'use strict';

class MongoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MongoError';
  }
}

class MongoDriverError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoDriverError';
  }
}

class MongoAPIError extends MongoDriverError {
  constructor(message) {
    super(message);
    this.name = 'MongoAPIError';
  }
}

class MongoRuntimeError extends MongoDriverError {
  constructor(message) {
    super(message);
    this.name = 'MongoRuntimeError';
  }
}

class MongoNetworkError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoNetworkError';
  }
}

class MongoNetworkTimeoutError extends MongoNetworkError {
  constructor(message) {
    super(message);
    this.name = 'MongoNetworkTimeoutError';
  }
}

class MongoServerError extends MongoError {
  constructor(message, code) {
    super(message);
    this.name = 'MongoServerError';
    this.code = code;
  }
}

class MongoServerSelectionError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoServerSelectionError';
  }
}

class MongoParseError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoParseError';
  }
}

class MongoInvalidArgumentError extends MongoAPIError {
  constructor(message) {
    super(message);
    this.name = 'MongoInvalidArgumentError';
  }
}

class MongoCompatibilityError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoCompatibilityError';
  }
}

class MongoWriteConcernError extends MongoError {
  constructor(message, result) {
    super(message);
    this.name = 'MongoWriteConcernError';
    this.result = result;
  }
}

class MongoBulkWriteError extends MongoError {
  constructor(message, result) {
    super(message);
    this.name = 'MongoBulkWriteError';
    this.result = result;
    this.writeErrors = result.writeErrors || [];
  }
}

class MongoTransactionError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoTransactionError';
  }
}

class MongoExpiredSessionError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoExpiredSessionError';
  }
}

class MongoNotConnectedError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoNotConnectedError';
  }
}

class MongoTopologyClosedError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoTopologyClosedError';
  }
}

class MongoCursorExhaustedError extends MongoError {
  constructor(message) {
    super(message || 'Cursor is exhausted');
    this.name = 'MongoCursorExhaustedError';
  }
}

class MongoCursorInUseError extends MongoError {
  constructor(message) {
    super(message || 'Cursor is already initialized');
    this.name = 'MongoCursorInUseError';
  }
}

class MongoGridFSStreamError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoGridFSStreamError';
  }
}

class MongoGridFSChunkError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoGridFSChunkError';
  }
}

class MongoChangeStreamError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoChangeStreamError';
  }
}

class MongoSystemError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoSystemError';
  }
}

class MongoMissingCredentialsError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoMissingCredentialsError';
  }
}

class MongoMissingDependencyError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoMissingDependencyError';
  }
}

class MongoTailableCursorError extends MongoError {
  constructor(message) {
    super(message || 'Tailable cursor does not support this operation');
    this.name = 'MongoTailableCursorError';
  }
}

class MongoBatchReExecutionError extends MongoError {
  constructor(message) {
    super(message || 'Batch cannot be re-executed');
    this.name = 'MongoBatchReExecutionError';
  }
}

class MongoUnexpectedServerResponseError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoUnexpectedServerResponseError';
  }
}

class MongoDecompressionError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoDecompressionError';
  }
}

class MongoStalePrimaryError extends MongoError {
  constructor(message) {
    super(message);
    this.name = 'MongoStalePrimaryError';
  }
}

module.exports = {
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
  MongoStalePrimaryError
};
