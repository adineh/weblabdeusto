'use strict';

angular
    .module('hwboard')
    .controller('MainController', MainController);


function MainController($scope, $rootScope, $injector, $log, $uibModal, $filter, advise) {
    var controller = this;

    // Debugging purposes.
    window.$rootScope = $rootScope;

    // For debugging
    window.mainScope = $scope;

    // ---------------
    // Dependencies & Initialization
    // ---------------
    // For some reason when we include $log through the injector
    // but it is not as an argument, it fails.
    statusUpdater = $injector.get("statusUpdater");
    statusUpdater.setOnStatusUpdate(onStatusUpdate);

    ledUpdater = $injector.get("ledUpdater");
    ledUpdater.setOnLedUpdate(onLedUpdate);

    virtualmodelUpdater = $injector.get("virtualmodelUpdater");
    virtualmodelUpdater.setOnVirtualmodelUpdate(onVirtualmodelUpdate);

    $log.debug("HW board experiment main controller");

    weblab.onStart(onStartInteraction);
    weblab.onFinish(onEndInteraction);


    // ---------------
    // Scope-related
    // ---------------
    $scope.time = 0;
    $scope.uploading = false;
    $scope.modals = {};
    $scope.webcamUrl = "images/video.png";

    $scope.doFileUpload = doFileUpload;
    $scope.openModal = openModal;
    window.debug = debug;

    if ($rootScope.BOOLEWEB_EXTERNAL !== undefined) {
        $scope.modals.reserveModal = openModal(1000, {
            title: $filter("translate")("welcome"),
            message: $filter("translate")("welcomeMsg"),
            openBooleMessage: $filter("translate")("openBooleMessage"),
            startCreatingMessage: $filter("translate")("startCreatingMessage"),
            booleLink: $rootScope.BOOLEWEB_EXTERNAL,
            canClose: false
        });
    } else {
        $scope.modals.reserveModal = openModal(1000, {
            title: $filter("translate")("welcome"),
            message: $filter("translate")("welcomeMsg"),
            canClose: false
        });
    }


    // ----------------
    // Implementations
    // ----------------

    function debug() {
        $scope.modals.reserveModal.dismiss();
    } // !debug

    function openModal(size, params) {
        var backdrop = true;
        if (!params.canClose)
            backdrop = "static";

        if ($rootScope.BOOLEWEB_EXTERNAL !== undefined) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'reserve_modal.controller.html',
                controller: 'ReserveModalController',
                size: size,
                resolve: {
                    params: params
                },
                backdrop: backdrop
            });
        } else {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modal.controller.html',
                controller: 'ModalController',
                size: size,
                resolve: {
                    params: params
                },
                backdrop: backdrop
            });
        }

        return modalInstance;
    } // !openModal


    function doFileUpload() {
        $log.debug("Trying to read file");

        $scope.uploading = true;

        try { // Read the file content using HTML5's FileReader API
            // TODO: Make sure this is stable, consider using a wrapper.
            var inputElem = $("#file")[0];
            var file = inputElem.files[0];
            var fileReader = new FileReader();
            window.gFileReader = fileReader; // For debugging
            fileReader.onload = onFileReadLoadEvent;
            fileReader.readAsBinaryString(file);
        } catch (e) {
            $scope.uploading = false;

            var errorMessage = "There was an error while trying to read your file. Please, ensure that" +
                " it is valid.";
            $log.error(errorMessage);
            $log.error(e);
            alert(errorMessage);
        }

        function onFileReadLoadEvent(ev) {
            var result = fileReader.result;

            var name = $("#file")[0].files[0].name;
            var content = result;
            var evalResult = advise.evalFile(content, name);
            var extension = name.split('.').pop();

            if (evalResult.result != "ok") {
                alert(evalResult.message);
                $scope.uploading = false;
                return;
            }

            $log.debug("File has been read client-side.");

            // Initialize the file ctrl
            weblab.sendFile(result, extension)
                .done(onFileSent)
                .fail(onFileSentFail);
        } // !onFileReadLoadEvent

    } // !doFileUpload

    function onFileSent(result) {
        $log.debug("FILE SENT: " + result);

        $scope.uploading = false;
    } // !onFileSend

    function onFileSentFail(result) {
        $log.debug("FILE SENDING ERROR: " + result);

        $scope.uploading = false;

        alert("The server reported an error with your file. Please, ensure that you sent a valid file and" +
            " try again.");
    } // !onFileSendError

    /**
     * To receive a notification whenever a status update is received.
     * @param status
     */
    function onStatusUpdate(status) {
        $log.debug("Status update: " + status);

        if (status != $scope.status) {

            if (status == "ready") {
                // If we just arrived to the ready mode we make sure to reset the virtualmodel.
                // Initialize the Virtual Model
                var command = sprintf("VIRTUALWORLD_MODEL %s", $rootScope.VIRTUALMODEL);
                weblab.sendCommand(command)
                    .done(onVirtualModelSetSuccess)
                    .fail(onVirtualModelSetFailure);

                // TODO: Maybe we should only do this once.
            }

            $scope.status = status;

            $scope.$apply();
        }
    } // !onStatusUpdate

    /**
     * To receive a notification whenever a LED update is received with the
     * status of each led.
     * @param leds String with a character for each one of the 8 LEDs.
     */
    function onLedUpdate(leds) {
        $log.debug("Led update: " + leds);
    } // !onLedUpdate

    /**
     * To receive a notification whenever a VirtualModel update is received.
     * @param virtualmodelUpdate
     */
    function onVirtualmodelUpdate(vmStatus) {
        $log.debug("Virtualmodel update: " + vmStatus);

        $scope.$broadcast("virtualmodel-status-report", vmStatus);
    } // !onVirtualmodelUpdate

    /**
     * To receive a notification whenever the interaction begins.
     * @param time
     * @param config
     */
    function onStartInteraction(time, config) {

        console.log("Received config on start: ");
        console.log(config);
        config = JSON.parse(config);

        // Remove the 'Please reserve' modal.
        $scope.modals.reserveModal.close("Reserve done");

        onTime(time);

        statusUpdater.start();
        ledUpdater.start();
        virtualmodelUpdater.start();

        // Set the webcam URL
        $scope.webcamUrl = config.webcam;
        $scope.$apply();

        // Initialize the Virtual Model
        var command = sprintf("VIRTUALWORLD_MODEL %s", $rootScope.VIRTUALMODEL);
        weblab.sendCommand(command)
            .done(onVirtualModelSetSuccess)
            .fail(onVirtualModelSetFailure);
    } // !onStartInteraction

    function onVirtualModelSetSuccess(response) {
        $log.debug("VirtualModel set: " + response);
    } // !onVirtualModelSetSuccess

    function onVirtualModelSetFailure(response) {
        $log.debug("VirtualModel set failure: " + response);
    } // !onVirtualModelSetFailure

    function onEndInteraction() {
        statusUpdater.stop();
        $scope.time = 0;
    } // !onEndInteraction

    function onTime(time) {
        $log.debug("TIME IS: " + time);
        $scope.time = time;
    } // !onTime

} // !MainController
