/*** Created by sly on 14-6-27.*/'use strict';var periodTypes = [    {        text: '今日',        value: '0,1'    },    {        text: '昨日',        value: '1,2'    },    {        text: '7天',        value: '0,7'    },    {        text: '30天',        value: '0,30'    },    {        text: '90天',        value: '0,90'    },    {        text: '180天',        value: '0,180'    },    {        text: '360天',        value: '0,360'    }];//draw chartfunction draw(config, callback) {    var multiRecords = [];              //record list    $('.stat-chart').each(function () {        Highcharts.setOptions({            global: {                useUTC: false            }        });        var $container = $(this).find('.content');        config.dataInfos = config.dataInfos || [];        var promises = config.dataInfos.map(function (dataInfo, index) {            return $.get(                '/api/data_sources/' + dataInfo.id            ).then(function (dataSource) {                return $.get(                    '/api/data_sources/' + dataInfo.id + '/records?period=' + (config.period || undefined)                ).then(function (resp) {                    //data:  record list                    multiRecords.push({                        dataSource: dataSource,                        records: resp                    });                    //data:  chart                    var lineOpt = {};                    lineOpt.name = dataSource.name;                    index = index >= defaultColors.length ? (index % defaultColors.length) : index;                    lineOpt.color = defaultColors[index];                    if (resp.length > 0) {                        lineOpt.data = [];                        resp = resp || [];                        //reverse: to show eldest data firstly                        resp.reverse().forEach(function (record) {                            lineOpt.data.push({                                x: getTimeFromRecord(record),                                y: record.value                            });                        });                        //reverse back                        resp.reverse();                    }                    return lineOpt;                });            });        });        $.when.apply(this, promises).done(function () {            var dataSeries = Array.prototype.slice.apply(arguments);            //init records list    --- sort multiRecords && init $scope.multiRecords            function initMultiRecords() {                var sortedMultiRecords = sortMultiRecords(                    (function () {                        return multiRecords.map(function (result) {                            return result.records;                        });                    }()), {                        formatDate: formatDate,                        invalidValue: '--'                    }                );                multiRecords.forEach(function (result, idx) {                    result.records = sortedMultiRecords[idx];                });                callback(multiRecords, config);            }            if (multiRecords.length > 0) {                initMultiRecords();                //init chart                $container.highcharts({                    chart: {                        type: 'spline',                        animation: Highcharts.svg, // don't animate in old IE                        marginRight: 10,                        events: {                            load: function () {                            }                        }                    },                    title: {                        text: ''                    },                    xAxis: {                        type: 'datetime',                        tickPixelInterval: 150,                        lineColor: 'rgb(102, 108, 103)'                    },                    yAxis: {                        title: null,                        gridLineColor: 'rgb(102, 108, 103)',                        plotLines: [                            {                                value: 0,                                width: 1,                                color: '#808080'                            }                        ]                    },                    tooltip: {                        crosshairs: true,                        shared: true                    },                    legend: {                        layout: 'horizontal',                        align: 'center',                        verticalAlign: 'bottom',                        borderWidth: 0,                        itemDistance: 30,                        itemStyle: {                            color: 'black'                        }                    },                    exporting: {                        enabled: false                    },                    series: dataSeries,                    plotOptions: {                        spline: {                            colors: defaultColors,                            dataLabels: {                                enabled: true,                                color: 'darkblack',                                formatter: function () {                                    if (this.point.x === this.series.data[this.series.data.length - 1].x) {                                        return this.y;                                    } else {                                        return null;                                    }                                }                            }                        },                        series: {                            turboThreshold: config.limit                        }                    }                });            }        });    });}/************************** App modlue *****************************/var statApp = angular.module('statApp', [    'ngRoute',    'services']);statApp.config(['$routeProvider',function ($routeProvider) {    $routeProvider        .when('/', {            templateUrl: '/public/src/stat.html',            controllers: 'StatCtrl'        });}]);statApp.controller('NavCtrl', ['$scope', '$routeParams', '$location', 'DataSource', '$route',    function ($scope, $routeParams, $location, DataSource, $route) {        $scope.selectedDataSources = [];        $scope.$on('$routeChangeSuccess', function () {            $scope.selectedPeriod = $routeParams.period ?                (function () {                    var selectedPeriod = null;                    periodTypes.some(function (p) {                        if (p.value === $routeParams.period) {                            selectedPeriod = p.value;                            return true;                        }                    });                    return selectedPeriod;                }())                : null;            var dataSourceIds = $route.current.params.dataSourceIds ?                (function () {                    var ids = $route.current.params.dataSourceIds.split(',');                    ids.forEach(function (id, idx) {                        ids[idx] = parseInt(id, 10);                    });                    return ids || [];                }()) : [];            $scope.selectedDataSources = dataSourceIds.map(function (id) {                return DataSource.get({                    id: id                });            });        });        $scope.dataSources = DataSource.query();        $scope.periodTypes = periodTypes;        $scope.isSelectedDataSource = function (dataSource) {            return $scope.selectedDataSources.some(function (ds) {                if (dataSource.id === ds.id) {                    return true;                }            });        };        $scope.addDataSource = function (dataSource) {            if ($scope.isSelectedDataSource(dataSource)) {                return;            }            $scope.selectedDataSources.push(dataSource);            $location.search('dataSourceIds', $scope.selectedDataSources.map(function (ds) {                return ds.id;            }).join(','));        };        $scope.delDataSource = function (dataSource) {            var idx = $scope.selectedDataSources.indexOf(dataSource);            if (idx === -1) {                return;            }            $scope.selectedDataSources.splice(idx, 1);            $location.search('dataSourceIds', $scope.selectedDataSources.map(function (ds) {                return ds.id;            }).join(','));        };        $scope.resetDataSource = function (dataSource, oldDataSource) {            if ($scope.isSelectedDataSource(dataSource)) {                return;            }            var idx = $scope.selectedDataSources.indexOf(oldDataSource);            if (idx === -1) {                return;            }            $scope.selectedDataSources[idx] = dataSource;        };        $scope.setPeriod = function (period) {            $scope.selectedPeriod = period.value;            $location.search('period', period);        };    }]);statApp.controller('StatCtrl', ['$scope', '$routeParams', '$location',    function ($scope, $routeParams, $location) {        if (!$routeParams.dataSourceIds) {            return;        }        if (!$routeParams.period) {            $location.search('period', '0,7');        }        $scope.isDataAlready = false;        $scope.widget = {};        $scope.widget.config = {            name: '',            reloadInterval: 600000,            period: $routeParams.period        };        var dataSourceIds = $routeParams.dataSourceIds ?            (function () {                var ids = $routeParams.dataSourceIds.split(',');                ids.forEach(function (id, idx) {                    ids[idx] = parseInt(id, 10);                });                return ids || [];            }()) : [];        $scope.widget.config.dataInfos = dataSourceIds.map(function (id) {            return {                id: id            };        });        //show data        draw($scope.widget.config, function (multiRecords, config) {            $scope.multiRecords = multiRecords;            $scope.isDataAlready = true;            $scope.$apply();            //set max number of points displayed in chart            config.limit = (multiRecords && multiRecords.length > 0 && multiRecords[0].records) ?                multiRecords[0].records.length: null;        });    }]);statApp.directive('checkDropdown', [    function () {        return {            restrict: 'A',            scope: {                currentDataSource: '=',                allDataSources: '=',                resetDataSource: '='            },            templateUrl: 'public/src/include/stat_dataSource_dropdown.html',            link: function ($scope, $elem) {                $scope.isFold = true;                function setFold() {                    $scope.isFold = true;                    $scope.$apply();                }                $scope.setUnfold = function () {                    $scope.isFold = false;                };                $elem.on('hide.bs.dropdown', setFold);                $scope.$on('$destroy', function () {                    $elem.find('a.dropdown-toggle').off('hide.bs.dropdown', setFold);                });            }        };    }]);