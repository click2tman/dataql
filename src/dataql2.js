/*jshint -W030 */

;(function(global){
  'use strict';

  /**
   * DataQL constructor
   */
  function DataQL(){
    var self = this;

    self._tables = [];
    self._operations = [];
    self._result = [];
  }

  /**
   * Comparators
   */
  DataQL.operators = {};

  // Equal
  DataQL.operators['='] = function(operand1, operand2) {
    return operand1 == operand2; // jshint ignore:line
  };

  // Greater than
  DataQL.operators['>'] = function(operand1, operand2) {
    return operand1 > operand2;
  };

  // Lower than
  DataQL.operators['<'] = function(operand1, operand2) {
    return operand1 < operand2;
  };

  // Greater or equal than
  DataQL.operators['>='] = function(operand1, operand2) {
    return operand1 >= operand2;
  };

  // Lower or equal than
  DataQL.operators['<='] = function(operand1, operand2) {
    return operand1 <= operand2;
  };

  /**
   * Get operator from string
   */
  DataQL.prototype._getCmp = function(cmp) {
    if(!_.isFunction(DataQL.operators[cmp]))
      throw new Error('Operator not supported');
    return DataQL.operators[cmp];
  };

  /**
   * Join tables
   */
  DataQL.prototype._join = function(resources, result, params){
    var self = this;
    var toJoin = [];
    var cmp = self._getCmp(params.where.cmp);

    if(_.has(resources, params.table)){
      toJoin = resources[params.table].records;
    }

    return _.map(result, function(resultRecord){

      // Get all the matched elements on the join table
      var matched = _.filter(toJoin, function(joinRecord){
        return cmp(
          resultRecord[params.where.left],
          joinRecord[params.where.right]
        );
      });

      // Extend results with the join table.
      // Like other sql databases we only use the first
      // matched element.
      return _.extend(resultRecord, _.first(matched));
    });
  };

  /**
   * Set table
   */
  DataQL.prototype._set = function(resources, result, params){
    return resources[params.table].records;
  };

  /**
   * Filter rows (aka. sql where)
   */
  DataQL.prototype._filter = function(resources, result, params){
    var self = this;
    var cmp = self._getCmp(params.where.cmp);

    return _.filter(result, function(record){
      return cmp(record[params.where.left], params.where.right);
    });
  };

  /**
   * Limit
   */
  DataQL.prototype._limit = function(resources, result, params){
    return result.slice(params.start, params.start + params.numRows);
  };

  /**
   * Sort
   */
  DataQL.prototype._sort = function(resources, result, params){
    // IMPLEMENT
    return result;
  };

  /**
   * Run operations
   */
  DataQL.prototype._runOps = function(){
    var self = this;

    _.each(self._operations, function(op){
      self._result = self['_' + op.method](
        self._resources,
        self._result,
        _.omit(op, 'method')
      );
    });

    return self;
  };

  /**
   * Get a backend from its string representation.
   * @param  {String} backend  Backend string representation.
   */
  DataQL.prototype._backendFromString = function(backend) {
    return _.findWhere(recline.Backend, {__type__: backend});
  };

  /**
   * Fetch all the tables and place them into sources
   */
  DataQL.prototype._fetchResources = function(){
    var self = this;
    var promises = [];

    _.each(self._tables, function(table){
      var backend = self._backendFromString(table.backend);

      if(!backend) throw new Error('Backend not found');

      promises.push(backend.fetch(table));
    });

    return $.when.apply($, promises);
  };


  /**********************
  *                     *
  *     PUBLIC API      *
  *                     *
  **********************/

  /**
   * Define the tables do you want to use.
   * Use the recline format to define backends.
   */
  DataQL.prototype.tables = function(){
    var self = this;

    // Tables to retrieve
    self._tables = _.toArray(arguments);

    // Fetched resources indexed by name
    self._resources = {};

    return self;
  };
  /**
   * Add an operation to the queue.
   */
  DataQL.prototype.ops = function(ops){
    var self = this;
    self._operations = ops;
    return self;
  };

  /**
   * Perform the query.
   */
  DataQL.prototype.execute = function(){
    var self = this;
    var tableNames = _.pluck(self._tables, 'as');

    self._fetchResources().done(function(){
     self._resources = _.zipObject(tableNames, _.toArray(arguments));
     self._runOps();
     console.table(self._result);
    });
  };

  // Expose dataql constructor
  global.DataQL = DataQL;
})(window);