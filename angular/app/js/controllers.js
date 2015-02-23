'use strict';

/* Controllers */

var maidcafeAppControllers = angular.module('maidcafeApp.controllers', []);

maidcafeAppControllers.controller('NavBarCtrl', [ '$scope', '$location', function($scope, $location) {
  $scope.isActive = function (location){
    return location === $location.path();
  };
}]);

maidcafeAppControllers.controller('MainCtrl', ['$scope', '$rootScope','$sails','$filter', function($scope, $rootScope, $sails,$filter){
  $rootScope.isNavBarVisible = false;
  (function() {
    $sails.get('/login')
      .success(function(data){
        if(data.user) {
          $scope.isLoginCollapsed = true;
          $rootScope.isNavBarVisible = true;
        }
      });

  })();

}]);

maidcafeAppControllers.controller('MenuCtrl', ['$scope', '$rootScope','$sails','$filter', function($scope, $rootScope,$sails,$filter) {
      // collapse the add menu by default
      clearForm();
      $scope.categories = {
        drink: [],
        entree: [],
        main: [],
        side: [],
        dessert: []
      };

      $scope.create = function(item){
        io.socket.post('/menuitem/create', item).success(function(data){
          if(data) clearForm();
        }).error(function(err){
          $rootScope.alerts.push({type: 'danger', msg: 'ERROR: Item not created. Verify all fields are filled and shortname is unique.'});
        });
      };

      function clearForm(){
        $scope.item = {};
        $scope.isAddMenuCollapsed = true;
      }

      (function() {
        $sails.get("/menuitem").success(function (response) {
          response.forEach(function(datum){
            $scope.categories[datum.category].push(datum);
          });

        }).error(function (response) { $rootScope.alerts.push({type: 'warning', msg: 'There was a problem getting the menu. Please try again.'});});

        $sails.on('menuitem', function(message){
          switch (message.verb){
            case 'created':
              $scope.categories[message.data.category].push(message.data);
              $scope.$apply();
              break;
            default: return;
          }
        });
      })();
}]);

maidcafeAppControllers.controller('MaidCtrl', ['$scope','$rootScope', '$sails','$filter', function($scope,$rootScope,$sails,$filter) {
    clearCustomerForm();
    clearOrderForm();

    $scope.customers = {};
    $scope.orders = {};
    $scope.categories = {
      drink: [],
      entree: [],
      main: [],
      side: [],
      dessert: []
    };

    $scope.createCustomer = function(item){
      var newCustomerData = {
        table: $scope.newOrder.table,
        name: item.name
      };
      $sails.post('/customer/create', newCustomerData)
        .success(function(data){ if(data) clearCustomerForm(); })
        .error(function(err){ $rootScope.alerts.push({type:'danger', msg: 'ERROR: Customer not added. Please try again.'});});
    };

    $scope.createOrder = function(data){
      data.orders.forEach(function(order){
        var orderObject = {
          table: data.table,
          category: order.category,
          customer: data.customer,
          menuItem: order
        };
        $sails.post('/order/create', orderObject)
          .error(function(err){ $rootScope.alerts.push({type:'danger', msg: 'ERROR: Order not created. Please try again.'});});
      });

      // guess everything went well
      clearOrderForm();
    };

    $scope.serveOrder = function(order) {
      $sails.put('/order/' + order.id, {'state': 'served'})
        .error(function(err) { $rootScope.alerts.push({type: 'danger', msg: 'ERROR: Order not updated. Please try again.'});});
    };

    function clearCustomerForm(){
      if($scope.newCustomer) $scope.newCustomer.name = "";
      else $scope.newCustomer = {};
    }

    function clearOrderForm(){
      $scope.isAddOrderCollapsed = true;
      if($scope.newOrder){
        $scope.newOrder.customer = {};
        $scope.newOrder.orders = [];
      }
    }

    (function() {
      $sails.get('/customer/activeCustomers').success(function (response) {
        $scope.customers = response;
      }).error(function (response) { $rootScope.alerts.push({type: 'warning', msg: 'Could not get customer list.'});});

      $sails.get('/order/pendingOrders').success(function(response) {
        $scope.orders = response;
      }).error(function (response) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get pending orders.'});});

      $sails.get('/menuitem').success(function (response) {
        response.forEach(function (datum){
          $scope.categories[datum.category].push(datum);
        });
      }).error(function (response) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get menu.'});});

      $sails.on('customer', function(message){
        switch (message.verb){
          case 'created':
            $scope.customers.push(message.data);
            $scope.$apply();
            break;
          default: return;
        }
      });

      $sails.on('order', function(message){
        switch (message.verb){
          case 'created':
            // annoying, have to populate objects ourselves
            $sails.get('/menuitem/' + message.data.menuItem)
              .success(function(menuitem){ message.data.menuItem = menuitem;})
              .error(function(err) { $rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating the orders. Please refresh.'});});
            $sails.get('/customer/' + message.data.customer)
              .success(function(customer){ message.data.customer = customer;})
              .error(function(err) { $rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating the orders. Please refresh.'});});

            $scope.orders.push(message.data);
            $scope.$apply();
            break;
          case 'updated':
            // we also get notified of relationships being updated, so ignore that
            if(!message.previous) break;
            var previous = $rootScope.findByProp($scope.orders, 'id', message.id);
            if(message.data.state === 'served') $scope.orders.splice($scope.orders.indexOf(previous), 1);
            else previous.state = message.data.state;

            $scope.$apply();
            break;
          case 'destroyed':
            // we also get notified of relationships being updated, so ignore that
            if(!message.previous) break;
            var previous = $rootScope.findByProp($scope.orders, 'id', message.id);
            $scope.orders.splice($scope.orders.indexOf(previous), 1);

            $scope.$apply();
            break;
          default: return;
        }
      });

      $sails.on('menuitem', function(message){
        switch (message.verb){
          case 'created':
            $scope.categories[message.data.category].push(message.data);
            $scope.$apply();
            break;
          default: return;
        }
      });

    })();
}]);

maidcafeAppControllers.controller('KitchenCtrl', ['$scope', '$rootScope','$sails','$filter', function($scope, $rootScope,$sails,$filter){
  $scope.categories = {
    drink: [],
    entree: [],
    main: [],
    side: [],
    dessert: []
  };

  $scope.updateOrder = function(order, state){
    $sails.put('/order/' + order.id, {'state': state})
      .error(function(err) { $rootScope.alerts.push({type: 'danger', msg: 'ERROR: There was a problem updating the order. Please try again.'});});
  };

  $scope.deleteOrder = function(order){
    $sails.delete('/order/' + order.id)
      .success(function(res) { if(typeof res == 'string') $rootScope.alerts.push({type: 'danger', msg: res});})
      .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'ERROR: There was a problem deleting the order. Please try again.'}); });
  };

  // https://codereview.stackexchange.com/questions/37028/grouping-elements-in-array-by-multiple-properties
  function groupBy( array , f ) {
    var groups = {};
    array.forEach( function( o ) {
      var group = JSON.stringify( f(o) );
      groups[group] = groups[group] || [];
      groups[group].push( o );
    });
    return Object.keys(groups).map( function( group ) {
      return groups[group];
    })
  }

  (function() {
    $sails.get('/order/pendingOrders').success(function(response){
      var groupedOrders = groupBy(response, function(item){
        return [item.category, item.table];
      });

      groupedOrders.forEach((function(group) {
        group.forEach(function (subgroup) {
          $scope.categories[subgroup.category].push(subgroup);
        });
      }));
    }).error(function (response) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get pending orders.'});});

    $sails.on('order', function(message){
      switch (message.verb){
        case 'created':
          // annoying, have to populate objects ourselves
          $sails.get('/menuitem/' + message.data.menuItem)
            .success(function(menuitem) { message.data.menuItem = menuitem;})
            .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating orders. Please refresh.'});});
          $sails.get('/customer/' + message.data.customer)
            .success(function(customer) { message.data.customer = customer; })
            .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating orders. Please refresh.'});});

          // http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array
          $scope.categories[message.data.category].splice( $scope.categories[message.data.category].map(function(e) { return e.table;}).lastIndexOf(message.data.table) + 1, 0, message.data);
          $scope.$apply();
          break;
        case 'updated':
          // we also get notified of relationships being updated, so ignore that
          if(!message.previous) break;
          var previous = $rootScope.findByProp($scope.categories[message.previous.category], 'id', message.id);

          if(previous) {
            if(message.data.state === 'served') $scope.categories[previous.category].splice($scope.categories[previous.category].indexOf(previous), 1);
            else previous.state = message.data.state;
          }
          $scope.$apply();
          break;
        case 'destroyed':
          if(!message.previous) break;
          var previous = $rootScope.findByProp($scope.categories[message.previous.category], 'id', message.id);
          $scope.categories[previous.category].splice($scope.categories[previous.category].indexOf(previous), 1);
          $scope.$apply();
          break;
        default: return;
      }
    });

  })();
}]);

maidcafeAppControllers.controller('CashierCtrl', ['$scope', '$rootScope','$sails','$filter', function($scope, $rootScope,$sails,$filter){
  $scope.customers = {};
  $scope.menuitems = {};
  $scope.orders = {};
  $scope.isCheckoutCollapsed = true;

  $scope.getTotal = function (customer){
    var total = 0.00;
    customer.orders.forEach(function(order){
      if(!order.menuItem.price){
        var item = $rootScope.findByProp($scope.menuitems, 'id', order.menuItem); // y u so expensive
        order.menuItem = item; //you'll thank me at checkout
      }
      total += order.menuItem.price;
    });
    return Number(total).toFixed(2);
  };

  $scope.checkout = function(customer){
    $scope.selectedCustomers = [customer];
    $scope.isCheckoutCollapsed = false;
  };

  $scope.cancelCheckout = function(){
    $scope.selectedCustomers = [];
    $scope.isCheckoutCollapsed = true;
  };

  $scope.confirmCheckout = function(customer){
    // mark each order as paid
    customer.orders.forEach(function(order){
      $sails.put('/order/' + order.id, {paid: true})
        .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'ERROR: There was a problem with the checkout. Please try again.'});});
    });
    // timestamp customer
    $sails.put('/customer/' + customer.id, {paidAt: new Date().toISOString()})
      .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'ERROR: There was a problem with the checkout. Please try again.'});});
    $scope.selectedCustomers = {};  // socket.on will take care of actually removing it from customers
    $scope.isCheckoutCollapsed = true;
  };

  (function() {
    $sails.get('/customer/activeCustomers')
      .success(function(response){ $scope.customers = response;})
      .error(function(err) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get customers.'});});

    $sails.get('/menuitem')
      .success(function(response){ $scope.menuitems = response;})
      .error(function(err) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get menu.'});});

    $sails.get('/order')
      .success(function(response){ $scope.orders = response;})
      .error(function(err) {$rootScope.alerts.push({type: 'warning', msg: 'Could not get orders.'});});

    $sails.on('customer', function(message){
      switch (message.verb){
        case 'addedTo':
          var customer = $rootScope.findByProp($scope.customers, 'id', message.id);
          // need to query the order data
          $sails.get('/order/' + message.addedId)
            .success(function(order){ customer.orders.push(order);})
            .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating customers. Please refresh.'});});
          $scope.$apply();
          break;
        case 'created':
          // simply push to customers since orders are always empty on new customers
          $scope.customers.push(message.data);
          $scope.$apply();
          break;
        case 'removedFrom':
          var customer = $rootScope.findByProp($scope.customers, 'id', message.id);
          var previous = $rootScope.findByProp(customer.orders, 'id', message.removedId);
          customer.orders.splice(customer.orders.indexOf(previous),1);
          $scope.$apply();
          break;
        case 'updated':
          if(!message.previous || !message.data.paidAt) break;
          var previous = $rootScope.findByProp($scope.customers, 'id', message.id);
          $scope.customers.splice($scope.customers.indexOf(previous),1);
          $scope.$apply();
          break;
        default: return;
      }
    });

    $sails.on('order', function(message){
      if (message.verb === 'updated' && message.data.state === 'served') {
        var customer = $rootScope.findByProp($scope.customers, 'id', message.previous.customer.id);
        var order = $rootScope.findByProp(customer.orders, 'id', message.id);
        order.state = 'served';
        $scope.$apply();
      }
    });

  })();
}]);

maidcafeAppControllers.controller('StatsCtrl', ['$scope', '$rootScope', '$sails', '$filter', function($scope, $rootScope, $sails, $filter) {
  $scope.customers = [];
  $scope.orders = [];

  $scope.ordersPerItem = function() { return $scope.orders.filter(function(o) { return o.paid; })
    .map(function(o) { return o.menuItem; })
    .reduce(function(prev, curr){
      if(!(curr.name in prev)) prev.push(prev[curr.name] = {name: curr.name, count: 1, earnings: curr.price});
      else {
        prev[curr.name].count++;
        prev[curr.name].earnings += curr.price;
      }
      return prev;
    }, [])
    .sort(function(a,b) { return b.count - a.count; })};

  $scope.totalAmountEarned = function() { return $scope.orders.filter(function(o) { return o.paid;})
    .map(function(o) { return o.menuItem.price; })
    .reduce(function(prev, curr) { return prev + curr; }, 0)};



  (function() {
    $sails.get('/customer')
      .success(function(res) { $scope.customers = res; })
      .error(function(err) { $rootScope.alerts.push({type: 'warning', msg: 'Could not get customers.'});});
    $sails.get('/order')
      .success(function(res) { $scope.orders = res; })
      .error(function(err) { $rootScope.alerts.push({type: 'warning', msg: 'Could not get orders.'});});

    $sails.on('customer', function(message) {
      switch(message.verb){
        case 'created':
          $scope.customers.push(message.data);
          break;
        case 'addedTo':
          var customer = $rootScope.findByProp($scope.customers, 'id', message.id);
          $sails.get('/order/' + message.addedId)
            .success(function(order){ customer.orders.push(order);})
            .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating customers. Please refresh.'});});
          break;
        case 'removedFrom':
          var customer = $rootScope.findByProp($scope.customers, 'id', message.id);
          var previous = $rootScope.findByProp(customer.orders, 'id', message.removedId);
          customer.orders.splice(customer.orders.indexOf(previous),1);
          break;
        default: return;
      }
      $scope.$apply();
    });

    $sails.on('order', function(message) {
      console.log(message);
      if (message.verb === 'created') {
        $sails.get('/menuitem/' + message.data.menuItem)
          .success(function(menuitem) { message.data.menuItem = menuitem;})
          .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating orders. Please refresh.'});});
        $sails.get('/customer/' + message.data.customer)
          .success(function(customer) { message.data.customer = customer; })
          .error(function(err) {$rootScope.alerts.push({type: 'danger', msg: 'There was a problem updating orders. Please refresh.'});});
        $scope.orders.push(message.data);
      }
      else if (message.verb === 'destroyed') {
        if(!message.previous) return;
        var previous = $rootScope.findByProp($scope.orders, 'id', message.id);
        $scope.orders.splice($scope.orders.indexOf(previous), 1);
      }
      else if (message.verb === 'updated' && message.data.paid) {
        var order = $rootScope.findByProp($scope.orders, 'id', message.id);
        order.paid = true;
      }
      else return;
      $scope.$apply();
    });

  })();
}]);
