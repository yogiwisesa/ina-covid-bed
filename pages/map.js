import { useEffect, useState, useMemo } from 'react'
import { Spinner, useColorMode } from '@chakra-ui/react'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-spring-bottom-sheet/dist/style.css'
import { BottomSheet } from 'react-spring-bottom-sheet'
import { NextSeo } from 'next-seo'
import SEO from 'next-seo.config'
import { Box, VStack, HStack, Text } from '@chakra-ui/react'

import ReactMapboxGl, { Marker, Popup } from 'react-mapbox-gl'

import HospitalCard from '@/components/HospitalCard'
import SearchProvince from '@/components/SearchProvince'
import useHospitalDataByProvince from '@/hooks/useHospitalDataByProvince'
import { provincesWithCities } from '@/utils/constants'
import { getNearestProvinces } from '@/utils/LocationHelper'

const Map = ReactMapboxGl({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX,
})

const Mark = () => (
  <Box
    bg="red"
    borderColor="red.200"
    borderRadius="50%"
    borderStyle="solid"
    borderWidth="4px"
    height="20px"
    width="20px"
  />
)

export default function MapPage() {
  const [map, setMap] = useState(null)
  const [activeLoc, setActiveLoc] = useState(undefined)
  const [alternativeProvinces, setAlternativeProvinces] = useState([])
  const { colorMode } = useColorMode()
  const isDarkMode = colorMode === 'dark'

  const [province, setProvince] = useState({
    value: 'jakarta',
    label: 'Jakarta',
  })
  const [myLocation, setMyLocation] = useState()
  const { bedFull, hospitalList } = useHospitalDataByProvince(
    province.value,
    myLocation
  )
  const isLoading = !Boolean(hospitalList)

  const [popupHospital, setPopupHospitalVisibility] = useState(false)
  const [isSearchingGeo, setSearchingGeo] = useState(false)

  const handleChooseProvince = (province) => {
    setProvince({ value: province.value, label: province.name })
    setAlternativeProvinces([])
  }

  useEffect(() => {
    if (hospitalList?.length) {
      handleSearchGeo()
    }
  }, [hospitalList])

  const handleSearchGeo = () => {
    alert(map.loaded())
    if (!map || !map.loaded()) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setSearchingGeo(true)
        setMyLocation({
          lat: latitude,
          lon: longitude,
        })
        const nearestProvinces = getNearestProvinces(latitude, longitude)

        setProvince({
          label: nearestProvinces[0].name,
          value: nearestProvinces[0].value,
        })
        setAlternativeProvinces(nearestProvinces.slice(1, 3))

        map.flyTo({
          center: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
          zoom: 12,
        })
      },
      (err) => {
        setSearchingGeo(false)
      }
    )
  }

  const handleHospitalClick = (hospital) => {
    setPopupHospitalVisibility(false)
    map.flyTo({
      center: { lat: parseFloat(hospital.lat), lng: parseFloat(hospital.lon) },
      zoom: 12,
    })
  }

  const availableHospital = useMemo(
    () => hospitalList?.filter((hospital) => hospital.available_bed > 0) || [],
    [hospitalList]
  )

  const jakartaLatLng = { lat: -6.163088, lng: 106.836715 }

  return (
    <Box position="relative" color="black">
      <NextSeo
        {...SEO({
          pageTitle: `${province.label} - Peta Ketersediaan Tempat Tidur`,
          pageDescription:
            'Peta ketersediaan tempat tidur IGD di rumah sakit seluruh Indonesia.',
          pageURL: 'https://bed.ina-covid.com/map',
          images: [
            {
              url: 'http://bed.ina-covid.com/images/og-image-map.png',
              width: 1000,
              height: 500,
              alt: 'ina-covid-bed-image',
            },
          ],
        })}
      />

      <Box
        position="relative"
        width="100vw"
        height="calc(100vh - 70px)"
        overflow="hidden"
      >
        <Map
          containerStyle={{
            height: '100vh',
            width: '100%',
          }}
          onDrag={() => setActiveLoc(undefined)}
          onStyleLoad={(loadedMap) => {
            setMap(loadedMap)
            loadedMap.setCenter(jakartaLatLng)
          }}
          style="mapbox://styles/mapbox/streets-v11"
        >
          {availableHospital?.map((hospital, i) => {
            return (
              <Marker
                key={i}
                coordinates={{
                  lat: parseFloat(hospital.lat),
                  lng: parseFloat(hospital.lon),
                }}
              >
                <Box
                  onClick={() => {
                    setActiveLoc(hospital)
                    if (map != null) {
                      map.easeTo({
                        center: {
                          lat: parseFloat(hospital.lat),
                          lng: parseFloat(hospital.lon),
                        },
                      })
                    }
                  }}
                >
                  <Mark key={i} />
                </Box>
              </Marker>
            )
          })}

          {myLocation && (
            <Marker
              coordinates={{
                lat: myLocation.lat,
                lng: myLocation.lon,
              }}
            >
              <Popup
                key={activeLoc.osm_id}
                anchor="bottom"
                coordinates={{ lat: activeLoc.lat, lng: activeLoc.lon }}
                style={{ marginTop: -20, padding: 0 }}
              >
                {JSON.stringify(activeLoc)}
              </Popup>
            </Marker>
          )}

          {activeLoc != undefined && (
            <Popup
              key={activeLoc.osm_id}
              anchor="bottom"
              coordinates={{ lat: activeLoc.lat, lng: activeLoc.lon }}
              style={{ marginTop: -20, padding: 0 }}
            >
              {JSON.stringify(activeLoc)}
            </Popup>
          )}
        </Map>
        <Box
          position="absolute"
          background="white"
          padding="1rem"
          boxShadow="0 2px 8px 0 rgb(48 49 53 / 16%)"
          borderRadius="8px"
          top="1rem"
          left="1rem"
          right="1rem"
          width={{ md: '400px' }}
        >
          <SearchProvince
            onChooseProvince={handleChooseProvince}
            onSearchGeo={handleSearchGeo}
            disabled={isLoading}
            value={province.label}
          />

          {Boolean(alternativeProvinces.length) && (
            <HStack
              fontSize={['xs', 'sm']}
              mt="1rem"
              w="100%"
              spacing="4"
              color="gray.500"
            >
              <Text>Provinsi sekitar:</Text>
              {alternativeProvinces.map((alternative) => (
                <Text
                  key={alternative.value}
                  onClick={() => handleChooseProvince(alternative)}
                  color="blue.600"
                  cursor="pointer"
                >
                  {alternative.name}
                </Text>
              ))}
            </HStack>
          )}
        </Box>

        <Box
          position="absolute"
          bottom="1rem"
          left="1rem"
          right="1rem"
          borderRadius="8px"
          padding="1rem"
          boxShadow="0 2px 8px 0 rgb(48 49 53 / 16%)"
          background="white"
          onClick={(e) => {
            e.preventDefault()
            setPopupHospitalVisibility(true)
          }}
        >
          <Text onClick={() => setPopupHospitalVisibility(true)}>
            {isLoading ? (
              <Spinner />
            ) : (
              `${availableHospital.length} rumah sakit tersedia dari ${hospitalList?.length} `
            )}
            <span style={{ color: '#F87A26', cursor: 'pointer' }}>
              (Daftar Rumah Sakit)
            </span>
          </Text>
        </Box>
      </Box>

      <BottomSheet
        open={popupHospital}
        onDismiss={() => setPopupHospitalVisibility(false)}
      >
        <Box padding="1rem" color="black">
          <VStack align="start" spacing="4">
            {!isLoading ? (
              hospitalList.map((hospital) => (
                <HospitalCard
                  onLocationClick={() => handleHospitalClick(hospital)}
                  onClick={() => handleHospitalClick(hospital)}
                  key={hospital.hospital_code}
                  hospital={hospital}
                />
              ))
            ) : (
              <Box w="100%" textAlign="center">
                <Spinner size="lg" />
              </Box>
            )}

            {!bedFull && hospitalList && hospitalList.length < 1 && (
              <Text textAlign="center" w="100%" p="24" color="gray.600">
                Tidak ditemukan data rumah sakit di provinsi ini
              </Text>
            )}
            {bedFull && (
              <Text
                fontSize="xl"
                textAlign="center"
                w="100%"
                py="24"
                color="gray.800"
              >
                ⚠️ Semua rumah sakit di{' '}
                <b>{getProvinceDisplayName(province)}</b> telah penuh! 😔
              </Text>
            )}
          </VStack>
        </Box>
      </BottomSheet>
    </Box>
  )
}

export const makeProvinceOptions = () => {
  return provincesWithCities.map((item) => ({
    value: item.province.value,
    label: item.province.name,
  }))
}
