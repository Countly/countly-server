window.MonetizationMetricsView = countlyView.extend({
  templateData: {},
  beforeRender: function() {
    var self = this;
    return $.when(
      $.get(countlyGlobal["path"] + '/monetization/templates/metrics.html', function(src) {
        self.template = Handlebars.compile(src);
      }),
      $.get(countlyGlobal["path"] + '/monetization/templates/bignumbers.html', function(src) {
        self.bigNumbersTemplate = Handlebars.compile(src);
      }),
      countlyMonetization.initialize()
    );
  },
  initializeEventSelector: function() {
    var self = this;
    $("#big-numbers-container").on("click", ".check", function() {
      var classes = $(this).attr('class');
      var id = $(this).attr('data-id');

      if (classes.indexOf('selected') >= 0) {
        if (countlyMonetization.tryDisableEvent(id)) {
          $(this).removeClass("selected");
        }
      } else {
        $(this).addClass("selected");
        countlyMonetization.enableEvent(id)
      }

      self.updateChart();
    });
  },
  renderCommon: function(isRefresh) {
    var self = this;
    if (!isRefresh) {
      $(this.el).html(self.template(this.templateData));
      self.initializeEventSelector()
      self.updateView(false)
    }
  },
  updateChart: function(fetchData) {
    var self = this;
    var data = self.getData();
    self.renderChart(data.chartDP);
  },
  updateView: function(isRefresh) {
    var self = this;
    var data = self.getData();
    self.renderChart(data.chartDP);
    self.renderNumbers(data.bigNumbersData);
    self.renderTable(data.tableData, isRefresh);
  },
  refresh: function() {
    var self = this;
    $.when(
      countlyMonetization.requestMetricData()
    ).done(function() {
      self.updateView(true)
    });
  },
  renderChart: function(data) {
    var enabledLines = countlyMonetization.getEnabledEvents();
    var dataToBeRendered = [];
    enabledLines.forEach(function(key) {
      dataToBeRendered.push(data[key]);
    })
    return countlyCommon.drawTimeGraph(dataToBeRendered, "#chartContainer");
  },
  renderNumbers: function(data) {
    var self = this;
    var compiled = self.bigNumbersTemplate({
      "bignumbers": data
    });

    $("#big-numbers-container").html(compiled);
  },
  renderTable: function(data, isRefresh) {
    var self = this;

    var tableData = data
    if (isRefresh) {
      CountlyHelpers.refreshTable($('#dataTable').dataTable(), tableData);
    } else {
      self.createTable(data);
    }
  },
  createTable: function(data, destroy) {
    var aoColumns = [{
      "mData": "date",
      "sType": "customDate",
      "sTitle": jQuery.i18n.map["common.date"]
    }];

    var eventColumns = countlyMonetization.getColumns();

    for (var ekey in eventColumns) {
      aoColumns.push({
        "mData": ekey,
        sType: "formatted-num",
        "mRender": function(d) {
          return countlyCommon.formatNumber(d);
        },
        "sTitle": jQuery.i18n.map[eventColumns[ekey].localize]
      }, )
    }

    if (destroy && $.fn.dataTable.fnIsDataTable('#dataTable')) {
      $("#dataTable").dataTable().fnDestroy();
      $("#dataTable").html("");
    }

    this.dtable = $('#dataTable').dataTable($.extend({}, $.fn.dataTable.defaults, {
      "aaData": data,
      "aoColumns": aoColumns
    }));

    $("#dataTable").stickyTableHeaders();
  },
  getData: function() {
    return countlyMonetization.getMetricData();
  },
});

window.MonetizationSignupView = countlyView.extend({
  beforeRender: function() {
    var self = this;
    return $.when($.get(countlyGlobal["path"] + '/monetization/templates/signup.html', function(src) {
      self.template = Handlebars.compile(src);
    })).then(function() {});
  },
  renderCommon: function(isRefresh) {
    $(this.el).html(this.template({}));
  },
  refresh: function() {

  },
});

app.monetizationSignupView = new MonetizationSignupView();
app.monetizationMetricsView = new MonetizationMetricsView();

app.route("/monetization/signup", 'monetization-signup', function() {
  this.renderWhenReady(this.monetizationSignupView);
});

app.route("/monetization/metrics", 'monetization-metrics', function() {
  this.renderWhenReady(this.monetizationMetricsView);
});

$(document).ready(function() {

  var folder = '<a class="item" id="sidebar-monetization"><div class="logo ion-social-usd"></div><div class="text" data-localize="monetization.title"></div><span class="ion-chevron-right"></span></a>'
  var items = [
    '<a href="#/monetization/signup" class="item"><div class="text" data-localize="monetization.signup">Signup</div></a>',
    '<a href="#/monetization/metrics" class="item"><div class="text" data-localize="monetization.metrics">Metrics</div></a>'
  ]
  var wrapper = '<div class="sidebar-submenu" id="monetization-submenu">' + items.join('') + '</div>'


  $('.sidebar-menu').append(folder + wrapper);
});
